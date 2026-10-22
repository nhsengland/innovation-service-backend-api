import { randomUUID } from 'crypto';
import type { EntityManager, QueryRunner } from 'typeorm';
import { CountSupportAcrossAssessments1792368000000 } from '../../../data-access/migrations/1792368000000-count-support-across-assessments';
import { InnovationEntity, InnovationSupportEntity } from '..';
import { InnovationStatusEnum, InnovationSupportStatusEnum } from '../../enums';
import { TestsHelper } from '../../tests';
import { InnovationBuilder } from '../../tests/builders/innovation.builder';
import { InnovationAssessmentBuilder } from '../../tests/builders/innovation-assessment.builder';
import { InnovationSupportBuilder } from '../../tests/builders/innovation-support.builder';
import { DomainInnovationsService } from '../../services/domain/domain-innovations.service';
import { container as notificationsContainer } from '../../../../apps/notifications/_config';
import type { RecipientsService } from '../../../../apps/notifications/_services/recipients.service';
import { SYMBOLS } from '../../../../apps/notifications/_services/symbols';

// These tests execute the deployed view and real reminder/archive selectors against SQL Server.
// Every fixture (including temporary deployment-date changes) is rolled back.
describe('grouped support status across assessments (SQL Server)', () => {
  const helper = new TestsHelper();
  const scenario = helper.getCompleteScenario();
  let em: EntityManager;
  const cutoff = new Date('2025-01-01T12:00:00Z');

  beforeAll(async () => {
    await helper.init();
  });
  beforeEach(async () => {
    em = await helper.getQueryRunnerEntityManager();
  });
  afterEach(async () => {
    await helper.releaseQueryRunnerEntityManager();
    jest.restoreAllMocks();
  });

  async function fixture(): Promise<{
    innovation: Awaited<ReturnType<InnovationBuilder['save']>>;
    old: Awaited<ReturnType<InnovationAssessmentBuilder['save']>>;
    current: Awaited<ReturnType<InnovationAssessmentBuilder['save']>>;
  }> {
    const builder = new InnovationBuilder(em)
      .setOwner(scenario.users.johnInnovator.id)
      .setStatus(InnovationStatusEnum.IN_PROGRESS);
    // The builder counter restarts after globalSetup, so use a unique fixture ID.
    (builder as unknown as { innovation: { uniqueId: string } }).innovation.uniqueId = randomUUID().slice(0, 14);
    const innovation = await builder.save();
    const old = await new InnovationAssessmentBuilder(em)
      .setInnovation(innovation.id)
      .setFinishedAt(new Date('2024-01-01Z'))
      .save();
    const current = await new InnovationAssessmentBuilder(em)
      .setInnovation(innovation.id)
      .setVersion(2, 0)
      .setFinishedAt(cutoff)
      .save();
    return { innovation, old, current };
  }
  async function support(
    innovationId: string,
    assessmentId: string,
    status: InnovationSupportStatusEnum,
    finishedAt?: Date
  ): Promise<Awaited<ReturnType<InnovationSupportBuilder['save']>>> {
    const builder = new InnovationSupportBuilder(em)
      .setInnovation(innovationId)
      .setMajorAssessment(assessmentId)
      .setOrganisationUnit(scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id)
      .setStatus(status);
    if (finishedAt) builder.setFinishedAt(finishedAt);
    return builder.save();
  }
  async function view(id: string): Promise<any> {
    return (await em.query('SELECT * FROM dbo.innovation_grouped_status_view_entity WHERE id = @0', [id]))[0];
  }

  it('keeps the original support link when Suggested becomes Engaging after reassessment', async () => {
    const f = await fixture();
    const s = await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.SUGGESTED);
    expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
    await new InnovationAssessmentBuilder(em)
      .setInnovation(f.innovation.id)
      .setVersion(3, 0)
      .setFinishedAt(cutoff)
      .save();
    await em.update(InnovationSupportEntity, s.id, { status: InnovationSupportStatusEnum.ENGAGING });
    expect((await view(f.innovation.id)).grouped_status).toBe('RECEIVING_SUPPORT');
    const [row] = await em.query('SELECT major_assessment_id FROM innovation_support WHERE id=@0', [s.id]);
    expect(row.major_assessment_id.toLowerCase()).toBe(f.old.id.toLowerCase());
  });

  it.each([InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.WAITING])(
    'counts %s on old/current links, including non-current records; ignores deleted records',
    async status => {
      const f = await fixture();
      for (const a of [f.old, f.current]) {
        const s = await support(f.innovation.id, a.id, status);
        expect((await view(f.innovation.id)).grouped_status).toBe('RECEIVING_SUPPORT');
        await em.update(InnovationSupportEntity, s.id, { isMostRecent: false });
        expect((await view(f.innovation.id)).grouped_status).toBe('RECEIVING_SUPPORT');
        await em.softDelete(InnovationSupportEntity, s.id);
        expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
      }
    }
  );

  it.each([InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE])(
    'counts %s only at/after latest major completion, regardless of link or isMostRecent',
    async status => {
      const f = await fixture();
      for (const a of [f.old, f.current]) {
        const s = await support(f.innovation.id, a.id, status, new Date(cutoff.getTime() - 1));
        expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
        await em.update(InnovationSupportEntity, s.id, { finishedAt: cutoff, isMostRecent: false });
        expect((await view(f.innovation.id)).grouped_status).toBe('NO_ACTIVE_SUPPORT');
        await em.update(InnovationSupportEntity, s.id, { finishedAt: new Date(cutoff.getTime() + 1000) });
        expect((await view(f.innovation.id)).grouped_status).toBe('NO_ACTIVE_SUPPORT');
        await em.softDelete(InnovationSupportEntity, s.id);
        expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
      }
    }
  );

  it('does not use a minor edit as the cutoff; requires non-null completion and closure', async () => {
    const f = await fixture();
    const s = await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.CLOSED, cutoff);
    await new InnovationAssessmentBuilder(em)
      .setInnovation(f.innovation.id)
      .setVersion(2, 1)
      .setFinishedAt(new Date('2025-02-01Z'))
      .save();
    expect((await view(f.innovation.id)).grouped_status).toBe('NO_ACTIVE_SUPPORT');
    await em.query('UPDATE innovation_assessment SET finished_at=NULL WHERE id=@0', [f.current.id]);
    expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
    await em.query('UPDATE innovation_assessment SET finished_at=@0 WHERE id=@1', [cutoff, f.current.id]);
    await em.query('UPDATE innovation_support SET finished_at=NULL WHERE id=@0', [s.id]);
    expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_SUPPORT');
  });

  it('uses latest closure; Suggested leaves countdown running and any ongoing unit wins', async () => {
    const f = await fixture();
    await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.CLOSED, cutoff);
    await support(f.innovation.id, f.current.id, InnovationSupportStatusEnum.UNSUITABLE, new Date('2025-02-01Z'));
    const suggested = await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.SUGGESTED);
    const [expected] = await em.query("SELECT DATEDIFF(DAY, '2025-02-01', GETDATE()) AS days");
    expect(await view(f.innovation.id)).toMatchObject({
      grouped_status: 'NO_ACTIVE_SUPPORT',
      days_since_no_active_support: expected.days
    });
    await em.update(InnovationSupportEntity, suggested.id, {
      status: InnovationSupportStatusEnum.WAITING,
      organisationUnit: { id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id }
    });
    expect((await view(f.innovation.id)).grouped_status).toBe('RECEIVING_SUPPORT');
  });

  it.each([
    [InnovationStatusEnum.CREATED, 'RECORD_NOT_SHARED'],
    [InnovationStatusEnum.NEEDS_ASSESSMENT, 'NEEDS_ASSESSMENT'],
    [InnovationStatusEnum.WITHDRAWN, 'WITHDRAWN'],
    [InnovationStatusEnum.ARCHIVED, 'ARCHIVED'],
    [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, 'AWAITING_NEEDS_REASSESSMENT']
  ])('preserves lifecycle %s and excludes deleted innovations', async (status, expected) => {
    const f = await fixture();
    await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.ENGAGING);
    await em.update(InnovationEntity, f.innovation.id, { status: status as InnovationStatusEnum });
    expect((await view(f.innovation.id)).grouped_status).toBe(expected);
    await em.softDelete(InnovationEntity, f.innovation.id);
    expect(await view(f.innovation.id)).toBeUndefined();
  });

  async function oldFixtureBaseline(): Promise<void> {
    const [module] = await em.query(
      "SELECT definition FROM sys.sql_modules WHERE object_id=OBJECT_ID('dbo.innovation_grouped_status_view_entity')"
    );
    await em.query(
      module.definition
        .replace(/^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+VIEW/i, 'ALTER VIEW')
        .replace(/'\d{4}-\d{2}-\d{2}'/g, "'2000-01-01'")
    );
  }
  it.each([29, 30, 31, 89, 90, 91, 149, 150, 151, 240])(
    'real reminder/archive selectors use cross-assessment closure at %i days',
    async days => {
      await oldFixtureBaseline();
      const f = await fixture();
      const [date] = await em.query('SELECT DATEADD(DAY, -@0, GETDATE()) AS closedAt', [days]);
      await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.CLOSED, date.closedAt);
      const suggested = await support(f.innovation.id, f.current.id, InnovationSupportStatusEnum.SUGGESTED);
      const recipients = notificationsContainer.get<RecipientsService>(SYMBOLS.RecipientsService);
      const result = await recipients.innovationsWithoutSupportForNDays([30, 90, 150], em);
      expect(result.some(r => r.id.toLowerCase() === f.innovation.id.toLowerCase())).toBe([30, 90, 150].includes(days));
      const archive = Object.create(DomainInnovationsService.prototype) as DomainInnovationsService;
      const action = jest.spyOn(archive, 'archiveInnovations').mockResolvedValue([] as never);
      await archive.archiveInnovationsWithoutSupport(em);
      expect(action.mock.calls.some(c => c[1].some(i => i.id.toLowerCase() === f.innovation.id.toLowerCase()))).toBe(
        days === 240
      );
      await em.update(InnovationSupportEntity, suggested.id, { status: InnovationSupportStatusEnum.ENGAGING });
      expect(
        (await recipients.innovationsWithoutSupportForNDays([30, 90, 150], em)).some(
          r => r.id.toLowerCase() === f.innovation.id.toLowerCase()
        )
      ).toBe(false);
      action.mockClear();
      await archive.archiveInnovationsWithoutSupport(em);
      expect(action.mock.calls.some(c => c[1].some(i => i.id.toLowerCase() === f.innovation.id.toLowerCase()))).toBe(
        false
      );
    }
  );
  it.each([-1, 1])('archive selector respects calendar deadline offset %i days', async offset => {
    await oldFixtureBaseline();
    const f = await fixture();
    const [date] = await em.query('SELECT DATEADD(MONTH, -6, DATEADD(DAY, @0, GETDATE())) AS closedAt', [offset]);
    await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.CLOSED, date.closedAt);
    const archive = Object.create(DomainInnovationsService.prototype) as DomainInnovationsService;
    const action = jest.spyOn(archive, 'archiveInnovations').mockResolvedValue([] as never);
    await archive.archiveInnovationsWithoutSupport(em);
    expect(action.mock.calls.some(c => c[1].some(i => i.id.toLowerCase() === f.innovation.id.toLowerCase()))).toBe(
      offset < 0
    );
  });

  it('preserves six calendar months at month end', async () => {
    await oldFixtureBaseline();
    const f = await fixture();
    await support(f.innovation.id, f.old.id, InnovationSupportStatusEnum.CLOSED, new Date('2025-08-31T12:00:00Z'));
    expect((await view(f.innovation.id)).expected_archive_date.toISOString()).toBe('2026-02-28T12:00:00.000Z');
  });

  it('round trips up/down/up preserving baseline, columns, module options and every support row', async () => {
    const migration = new CountSupportAcrossAssessments1792368000000();
    const runner = em.queryRunner!;
    const snapshot = async (): Promise<{ module: any; columns: unknown[]; supports: unknown[] }> => ({
      module: (
        await em.query(
          "SELECT definition, uses_ansi_nulls, uses_quoted_identifier FROM sys.sql_modules WHERE object_id=OBJECT_ID('dbo.innovation_grouped_status_view_entity')"
        )
      )[0],
      columns: await em.query(
        "SELECT name, column_id, system_type_id, max_length, is_nullable FROM sys.columns WHERE object_id=OBJECT_ID('dbo.innovation_grouped_status_view_entity') ORDER BY column_id"
      ),
      supports: await em.query('SELECT * FROM innovation_support ORDER BY id')
    });
    const before = await snapshot();
    await migration.down(runner);
    const old = await snapshot();
    expect(old.module.definition).toContain('i.current_major_assessment_id = s.major_assessment_id');
    expect(old.module.definition.match(/'\d{4}-\d{2}-\d{2}'/g)).toEqual(
      before.module.definition.match(/'\d{4}-\d{2}-\d{2}'/g)
    );
    expect(old.columns).toEqual(before.columns);
    expect(old.supports).toEqual(before.supports);
    expect(old.module.uses_ansi_nulls).toBe(before.module.uses_ansi_nulls);
    expect(old.module.uses_quoted_identifier).toBe(before.module.uses_quoted_identifier);
    await migration.up(runner);
    expect(await snapshot()).toEqual(before);
    await migration.down(runner);
    await migration.up(runner);
    expect(await snapshot()).toEqual(before);
  });

  it('fails safely when definition is missing or either known CTE has drifted', async () => {
    const migration = new CountSupportAcrossAssessments1792368000000();
    const [module] = await em.query(
      "SELECT definition, uses_ansi_nulls, uses_quoted_identifier FROM sys.sql_modules WHERE object_id=OBJECT_ID('dbo.innovation_grouped_status_view_entity')"
    );
    for (const row of [
      undefined,
      { ...module, definition: null },
      { ...module, definition: module.definition.replace('engaging AS', 'unexpected AS') },
      { ...module, definition: module.definition.replace("'ENGAGING', 'WAITING'", "'ENGAGING'") },
      { ...module, definition: module.definition.replace('MAX(s.finished_at)', 'MIN(s.finished_at)') }
    ]) {
      const query = jest.fn().mockResolvedValue(row ? [row] : []);
      const runner = { query, isTransactionActive: true } as unknown as QueryRunner;
      await expect(migration.up(runner)).rejects.toThrow('Cannot alter grouped status view');
      await expect(migration.down(runner)).rejects.toThrow('Cannot alter grouped status view');
      expect(query).toHaveBeenCalledTimes(2); // Reads only: no SET or ALTER on rejected definitions.
    }
  });

  it('rejects nontransactional runners before reading or changing the view', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const runner = { query, isTransactionActive: false } as unknown as QueryRunner;
    const migration = new CountSupportAcrossAssessments1792368000000();
    await expect(migration.up(runner)).rejects.toThrow('active transaction');
    await expect(migration.down(runner)).rejects.toThrow('active transaction');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects unexpected headers in either direction, including already-target definitions', async () => {
    const migration = new CountSupportAcrossAssessments1792368000000();
    const read = async (): Promise<any> =>
      (
        await em.query(
          "SELECT definition, uses_ansi_nulls, uses_quoted_identifier FROM sys.sql_modules WHERE object_id=OBJECT_ID('dbo.innovation_grouped_status_view_entity')"
        )
      )[0];
    const current = await read();
    await migration.down(em.queryRunner!);
    const previous = await read();
    await migration.up(em.queryRunner!);
    for (const module of [current, previous]) {
      for (const direction of ['up', 'down'] as const) {
        const query = jest.fn().mockResolvedValue([
          {
            ...module,
            definition: module.definition.replace(
              '[dbo].[innovation_grouped_status_view_entity]',
              '[dbo].[unexpected_view]'
            )
          }
        ]);
        await expect(
          migration[direction]({ query, isTransactionActive: true } as unknown as QueryRunner)
        ).rejects.toThrow('unexpected view header');
        expect(query).toHaveBeenCalledTimes(1);
      }
    }
  });

  it('preserves initial needs assessment label before the first major assessment', async () => {
    const f = await fixture();
    await em.query(
      'UPDATE innovation SET current_assessment_id=@0, current_major_assessment_id=@0, status=@1 WHERE id=@2',
      [f.old.id, InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT, f.innovation.id]
    );
    expect((await view(f.innovation.id)).grouped_status).toBe('AWAITING_NEEDS_ASSESSMENT');
  });
});
