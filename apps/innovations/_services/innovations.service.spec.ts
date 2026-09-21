import {
  InnovationAssessmentEntity,
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  InnovationTaskEntity
} from '@innovations/shared/entities';
import { ActivityEnum, ActivityTypeEnum } from '@innovations/shared/enums';
import {
  InnovationArchiveReasonEnum,
  InnovationExportRequestStatusEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportCloseReasonEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum
} from '@innovations/shared/enums/innovation.enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import type { TestActivityLogType } from '@innovations/shared/tests/builders/activity-log.builder';
import { ActivityLogBuilder } from '@innovations/shared/tests/builders/activity-log.builder';
import { InnovationAssessmentBuilder } from '@innovations/shared/tests/builders/innovation-assessment.builder';
import { InnovationSectionBuilder } from '@innovations/shared/tests/builders/innovation-section.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import {
  randCompanyName,
  randCountry,
  randCountryCode,
  randDomainName,
  randPastDate,
  randText,
  randUuid
} from '@ngneat/falso';
import assert from 'node:assert';
import { EntityManager } from 'typeorm';
import { container } from '../_config';
import { InnovationSupportsService } from './innovation-supports.service';
import type { InnovationsService } from './innovations.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovations suite', () => {
  let sut: InnovationsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationsService>(SYMBOLS.InnovationsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockClear();
    supportLogSpy.mockClear();
    notifierSendSpy.mockClear();
  });

  describe.skip('getInnovationsList', () => {
    //TODO
    it('should list innovations', async () => {});
  });

  describe.skip('getInnovationInfo', () => {
    //TODO
    it('should get innovation info', async () => {});
  });

  describe('getNeedsAssessmentOverdueInnovations', () => {
    it.each([InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT as const, InnovationStatusEnum.NEEDS_ASSESSMENT as const])(
      'should get the number of innovations with overdue assessments in status %s',
      async (
        innovationStatus: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT
      ) => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
        const pastDate = randPastDate();
        pastDate.setDate(-30);

        //add an overdue assessment on johnInnovationEmpty
        await em
          .getRepository(InnovationEntity)
          .update({ id: innovation.id }, { submittedAt: pastDate, status: innovationStatus });
        await new InnovationAssessmentBuilder(em)
          .setInnovation(innovation.id)
          .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
          .save();

        const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { innovationStatus: [innovationStatus], assignedToMe: false },
          em
        );

        expect(countAssessments).toBe(1);
      }
    );

    it('should get the number of innovations with overdue assessments that are assigned to me', async () => {
      const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
      const adamInnovation = scenario.users.adamInnovator.innovations.adamInnovationEmpty;

      //add an overdue assessment on johnInnovationEmpty assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: johnInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(johnInnovation.id)
        .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
        .save();

      //add an overdue assessment on adamInnovationEmpty not assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: adamInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(adamInnovation.id)
        .setNeedsAssessor(scenario.users.seanNeedsAssessor.id)
        .save();

      const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], assignedToMe: true },
        em
      );

      expect(countAssessments).toBe(1);
    });
  });

  describe('createInnovation', () => {
    it('should create an innovation', async () => {
      const result = await sut.createInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          name: randCompanyName(),
          description: randText({ charCount: 10 }),
          countryName: randCountry(),
          officeLocation: randCountry(),
          postcode: randCountryCode(),
          hasWebsite: 'YES',
          website: randDomainName()
        },
        em
      );

      expect(result.id).toBeDefined();

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should throw an error if the name is not unique', async () => {
      await expect(() =>
        sut.createInnovation(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          {
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            description: randText({ charCount: 10 }),
            countryName: randCountry(),
            officeLocation: randCountry(),
            postcode: randCountryCode(),
            website: randDomainName(),
            hasWebsite: 'YES'
          },
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS));
    });
  });

  describe('getInnovationShares', () => {
    it('should get the organisations the innovation is shared with', async () => {
      const result = await sut.getInnovationShares(scenario.users.johnInnovator.innovations.johnInnovation.id, em);

      expect(result).toMatchObject([
        {
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym
          }
        },
        {
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym
          }
        },
        {
          organisation: {
            id: scenario.organisations.innovTechOrg.id,
            name: scenario.organisations.innovTechOrg.name,
            acronym: scenario.organisations.innovTechOrg.acronym
          }
        }
      ]);
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationShares(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('updateInnovationShares', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    const getInnovationSuggestedUnitsSpy = jest
      .spyOn(InnovationSupportsService.prototype, 'getInnovationSuggestedUnits')
      .mockResolvedValue([]);
    const createSuggestedSupports = jest.spyOn(InnovationSupportsService.prototype, 'createSuggestedSupports');

    beforeEach(() => {
      getInnovationSuggestedUnitsSpy.mockClear();
      createSuggestedSupports.mockClear();
    });

    afterAll(() => {
      getInnovationSuggestedUnitsSpy.mockRestore();
      createSuggestedSupports.mockRestore();
    });

    it('should update the organisations that the innovation is shared with', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.organisationShares).toHaveLength(1);
      expect(dbInnovation?.organisationShares[0]?.id).toBe(scenario.organisations.innovTechOrg.id);

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should set all open tasks from removed organisations to DECLINED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .where('task.innovation_support_id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .andWhere('task.status IN (:...taskStatus)', { taskStatus: [InnovationTaskStatusEnum.OPEN] })
        .getMany();

      expect(dbTasks).toHaveLength(0);
    });

    it('should set all ongoing supports from removed organisations to CLOSED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .getMany();

      for (const support of dbSupports) {
        expect(support.status).toBe(InnovationSupportStatusEnum.CLOSED);
      }
    });

    it('should reject all pending export requests from removed orgs', async () => {
      // ensure request is pending
      await em.update(
        InnovationExportRequestEntity,
        { id: innovation.exportRequests.requestBySam.id },
        { status: InnovationExportRequestStatusEnum.PENDING }
      );

      // Remove medTechOrg share
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.healthOrg.id],
        em
      );

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .select(['request.status', 'request.rejectReason'])
        .where('request.id = :requestId', { requestId: innovation.exportRequests.requestBySam.id })
        .getOne();

      expect(dbRequest?.status).toBe(InnovationExportRequestStatusEnum.REJECTED);
      expect(dbRequest?.rejectReason).toBe(TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.STOP_SHARING'));
    });

    it('should add a support when adding a share if the support organisation unit had been suggested', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
      getInnovationSuggestedUnitsSpy.mockResolvedValueOnce([
        scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.id
      ]);
      await em.query('DELETE FROM innovation_share WHERE innovation_id = @0', [innovation.id]);
      await sut.updateInnovationShares(context, innovation.id, [scenario.organisations.innovTechOrg.id], em);

      expect(createSuggestedSupports).toHaveBeenCalled();
      expect(createSuggestedSupports).toHaveBeenCalledWith(
        context,
        innovation.id,
        [scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.id],
        em
      );
    });

    it("should not add a support when adding a share if the support organisation unit hadn't been suggested", async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
      await em.query('DELETE FROM innovation_share WHERE innovation_id = @0', [innovation.id]);
      await sut.updateInnovationShares(context, innovation.id, [scenario.organisations.innovTechOrg.id], em);

      expect(createSuggestedSupports).toHaveBeenCalledTimes(0);
    });

    it('should not add support when sharing with an organisation that was already shared', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
      await sut.updateInnovationShares(context, innovation.id, [scenario.organisations.innovTechOrg.id], em);

      expect(createSuggestedSupports).toHaveBeenCalledTimes(0);
    });

    it('should add the stop share to support summary from removed units', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

      // Remove medTechOrg share
      await sut.updateInnovationShares(context, innovation.id, [scenario.organisations.healthOrg.id], em);

      expect(supportLogSpy).toHaveBeenCalledTimes(1);
      expect(supportLogSpy).toHaveBeenCalledWith(
        expect.any(EntityManager),
        { id: context.id, roleId: context.currentRole.id },
        innovation.id,
        {
          type: InnovationSupportLogTypeEnum.STOP_SHARE,
          unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
          description: '',
          supportStatus: InnovationSupportStatusEnum.CLOSED
        }
      );
    });

    it(`should throw an error if any of the provided organisations doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, [
          scenario.organisations.innovTechOrg.id,
          randUuid()
        ])
      ).rejects.toThrow(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND));
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), [
          scenario.organisations.innovTechOrg.id
        ])
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('submitInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

    it('should submit the innovation for needs assessment', async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      await testsHelper.submitAllInnovationSections(innovation.id, em);

      const result = await sut.submitInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.status).toBe(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT);
      expect(result).toMatchObject({ id: innovation.id, status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), em)
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      //add submitted section to innovation
      await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('INNOVATION_DESCRIPTION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE));
    });
  });

  describe('archiveInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
    const reason = InnovationArchiveReasonEnum.ALREADY_LIVE_NHS;

    it('should archive the innovation', async () => {
      await sut.archiveInnovation(context, innovation.id, { reason }, em);

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select(['innovation.status', 'innovation.archiveReason'])
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOneOrFail();

      expect(dbInnovation.status).toBe(InnovationStatusEnum.ARCHIVED);
      expect(dbInnovation.archiveReason).toBe(reason);
    });

    it('should cancel all open tasks', async () => {
      const dbPreviouslyOpenTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .select(['task.status', 'task.id'])
        .innerJoin('task.innovationSection', 'innovationSection')
        .innerJoin('innovationSection.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('task.status IN (:...openTaskStatuses)', {
          openTaskStatuses: [InnovationTaskStatusEnum.OPEN]
        })
        .getMany();

      await sut.archiveInnovation(context, innovation.id, { reason }, em);

      const dbCancelledTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .select(['task.status'])
        .where('task.id IN (:...taskIds)', { taskIds: dbPreviouslyOpenTasks.map(a => a.id) })
        .getMany();

      expect(dbCancelledTasks).toHaveLength(dbPreviouslyOpenTasks.length);
    });

    it('should close all support', async () => {
      const dbPreviousSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'support.status', 'userRole.id', 'user.id'])
        .innerJoin('support.innovation', 'innovation')
        .leftJoin('support.userRoles', 'userRole')
        .leftJoin('userRole.user', 'user')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('support.status NOT IN (:...statuses)', {
          statuses: [InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE]
        })
        .andWhere('support.isMostRecent = 1')
        .getMany();

      await sut.archiveInnovation(context, innovation.id, { reason }, em);

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'support.status', 'support.closeReason', 'support.finishedAt'])
        .where('support.id IN (:...supportIds)', { supportIds: dbPreviousSupports.map(s => s.id) })
        .getMany();

      for (const support of dbSupports) {
        const previousSupport = dbPreviousSupports.find(s => s.id === support.id);
        assert(previousSupport);
        expect(support.status).toBe(InnovationSupportStatusEnum.CLOSED);
        expect(support.closeReason).toBe(InnovationSupportCloseReasonEnum.ARCHIVE);
        expect(support.finishedAt).toStrictEqual(expect.any(Date));
      }
    });

    it('should reject all pending export requests', async () => {
      // ensure request is pending
      await em
        .getRepository(InnovationExportRequestEntity)
        .update(
          { id: innovation.exportRequests.requestByAlice.id },
          { status: InnovationExportRequestStatusEnum.PENDING }
        );

      await sut.archiveInnovation(context, innovation.id, { reason }, em);

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .select(['request.status', 'request.rejectReason'])
        .where('request.id = :requestId', { requestId: innovation.exportRequests.requestByAlice.id })
        .getOne();

      expect(dbRequest?.status).toBe(InnovationExportRequestStatusEnum.REJECTED);
      expect(dbRequest?.rejectReason).toBe(TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.ARCHIVE'));
    });

    it('should add the archive to support summary', async () => {
      const nPreviousSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('innovation_id = :innovationId', { innovationId: innovation.id })
        .getCount();

      await sut.archiveInnovation(context, innovation.id, { reason }, em);

      expect(supportLogSpy).toHaveBeenCalledTimes(nPreviousSupports);
      expect(supportLogSpy).toHaveBeenLastCalledWith(
        expect.any(EntityManager),
        { id: context.id, roleId: context.currentRole.id },
        innovation.id,
        {
          type: InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED,
          description: TranslationHelper.translate(`ARCHIVE_REASONS.${reason}`),
          unitId: expect.any(String),
          supportStatus: InnovationSupportStatusEnum.CLOSED
        }
      );
    });

    describe('Needs assessment side-effects', () => {
      const ottoOctavius = scenario.users.ottoOctaviusInnovator;

      it('should and complete assessment when innovation is in NEEDS_ASSESSMENT', async () => {
        const naInProgress = ottoOctavius.innovations.brainComputerInterfaceInnovation;

        await sut.archiveInnovation(DTOsHelper.getUserRequestContext(ottoOctavius), naInProgress.id, { reason }, em);

        const dbAssessment = await em
          .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
          .select(['assessment.id', 'assessment.finishedAt', 'assessment.updatedBy'])
          .where('assessment.innovation_id = :innovationId', { innovationId: naInProgress.id })
          .getOneOrFail();

        expect(dbAssessment.id).toBe(naInProgress.assessmentInProgress.id);
        expect(dbAssessment.finishedAt).toBeDefined();
        expect(dbAssessment.updatedBy).toBe(ottoOctavius.id);
      });

      it('should create and complete an assessment when innovation is in WAITING_NEEDS_ASSESSMENT', async () => {
        const waitingNa = ottoOctavius.innovations.powerSourceInnovation;

        await sut.archiveInnovation(DTOsHelper.getUserRequestContext(ottoOctavius), waitingNa.id, { reason }, em);

        const dbAssessment = await em
          .createQueryBuilder(InnovationAssessmentEntity, 'assessment')
          .select(['assessment.id', 'assessment.finishedAt', 'assessment.updatedBy', 'assessment.createdBy'])
          .where('assessment.innovation_id = :innovationId', { innovationId: waitingNa.id })
          .getOneOrFail();

        expect(dbAssessment.id).toBeDefined();
        expect(dbAssessment.finishedAt).toBeDefined();
        expect(dbAssessment.updatedBy).toBe(ottoOctavius.id);
        expect(dbAssessment.createdBy).toBe(ottoOctavius.id);
      });
    });
  });

  describe('getInnovationActivitiesLog', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    let activityLogOld: TestActivityLogType;
    let activityLogNew: TestActivityLogType;

    beforeEach(async () => {
      activityLogOld = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.TASKS)
        .setActivity(ActivityEnum.TASK_CREATION)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2015'))
        .setCreatedBy(scenario.users.aliceQualifyingAccessor)
        .setInterveningUser(scenario.users.aliceQualifyingAccessor)
        .save();

      activityLogNew = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.NEEDS_ASSESSMENT)
        .setActivity(ActivityEnum.NEEDS_ASSESSMENT_COMPLETED)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2022'))
        .setCreatedBy(scenario.users.paulNeedsAssessor)
        .setInterveningUser(scenario.users.paulNeedsAssessor)
        .save();
    });

    it('should return the activity log data of the innovation', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          },
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation ordered by ascending creation date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          },
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation for the given activity type', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          activityTypes: [ActivityTypeEnum.TASKS]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given start date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          dateFilters: [{ field: 'createdAt', startDate: new Date('10/10/2020') }]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given end date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          dateFilters: [{ field: 'createdAt', endDate: new Date('10/10/2020') }]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });
  });

  describe('getInnovationSubmissionsState', () => {
    it('should get the innovation submission state', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getInnovationSubmissionsState(innovation.id, em);

      expect(result).toMatchObject({
        submittedAllSections: false,
        submittedForNeedsAssessment: true
      });
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSubmissionsState(randUuid(), em)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationProgress', () => {
    // Not testing the progress update part as the units don't exist in scenario nor the payloads as they are all randomly generated
    // and the result is actually dependent on sql view logic
    it('should get the innovation progress info', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getInnovationProgress(innovation.id, em);

      expect(result).toMatchObject({
        innovationId: expect.any(String)
      });
    });

    it("shouldn't include falsy/null values in the response", async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getInnovationProgress(innovation.id, em);

      expect(Object.values(result).filter(v => !v)).toHaveLength(0);
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationProgress(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationRelavantOrganisationsStatusList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return organisations with relevant status and its users', async () => {
      const relevantStatusOrganisationList = await sut.getInnovationRelavantOrganisationsStatusList(
        innovation.id,
        true,
        em
      );

      expect(relevantStatusOrganisationList).toMatchObject([
        {
          id: innovation.id,
          status: innovation.supports.supportByHealthOrgUnit.relevantStatus,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          },
          recipients: [
            {
              id: scenario.users.aliceQualifyingAccessor.id,
              roleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
              name: scenario.users.aliceQualifyingAccessor.name
            },
            {
              id: scenario.users.jamieMadroxAccessor.id,
              roleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id,
              name: scenario.users.jamieMadroxAccessor.name
            }
          ]
        },
        {
          id: innovation.id,
          status: innovation.supports.supportByHealthOrgUnit.relevantStatus,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          },
          recipients: [
            {
              id: scenario.users.samAccessor.id,
              roleId: scenario.users.samAccessor.roles.accessorRole.id,
              name: scenario.users.samAccessor.name
            }
          ]
        }
      ]);
    });

    it('should return organisations with relevant status', async () => {
      const relevantStatusOrganisationList = await sut.getInnovationRelavantOrganisationsStatusList(
        innovation.id,
        false,
        em
      );

      expect(relevantStatusOrganisationList).toMatchObject([
        {
          status: innovation.supports.supportByHealthOrgUnit.relevantStatus,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          }
        },
        {
          status: innovation.supports.supportByHealthOrgAiUnit.relevantStatus,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          }
        },
        {
          status: innovation.supports.supportByHealthOrgUnit.relevantStatus,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          }
        }
      ]);
    });

    it(`should return an empty list`, async () => {
      const relevantStatusOrganisationList = await sut.getInnovationRelavantOrganisationsStatusList(
        randUuid(),
        false,
        em
      );
      expect(relevantStatusOrganisationList).toHaveLength(0);
    });
  });

  describe('getNextUniqueIdentifier', () => {
    it('should return the next unique identifier as YYMM-0001-X if first for the year/month', async () => {
      const result = await sut.getNextUniqueIdentifier(em);

      const currentYearMonth = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
      const checksum = `${currentYearMonth}0001`.split('').reduce((acc, curr) => acc + Number(curr), 0) % 10;
      expect(result).toBe(`INN-${currentYearMonth}-0001-${checksum}`);
    });

    it('should return the next unique identifier as YYMM-0002-X if second year/month', async () => {
      const currentYearMonth = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);

      // uniqueId not updatable
      await em.query('UPDATE innovation SET unique_id = @0 WHERE id = @1', [
        `INN-${currentYearMonth}-0001-1`,
        scenario.users.johnInnovator.innovations.johnInnovation.id
      ]);
      const result = await sut.getNextUniqueIdentifier(em);

      const checksum = `${currentYearMonth}0002`.split('').reduce((acc, curr) => acc + Number(curr), 0) % 10;
      expect(result).toBe(`INN-${currentYearMonth}-0002-${checksum}`);
    });
  });

  describe('shareInnovationsWithOrganisation', () => {
    // John has 3 innovations, Jane is collaborator in 2
    const john = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
    const jane = DTOsHelper.getUserRequestContext(scenario.users.janeInnovator);
    let updateInnovationSharesMock: jest.SpyInstance;

    beforeAll(() => {
      updateInnovationSharesMock = jest.spyOn(sut, 'updateInnovationShares').mockResolvedValue();
    });

    beforeEach(() => {
      updateInnovationSharesMock.mockClear();
    });

    afterAll(() => {
      updateInnovationSharesMock.mockRestore();
    });

    it('should share all the innovator innovations with the organisation', async () => {
      await sut.shareInnovationsWithOrganisation(john, scenario.organisations.notSharedOrg.id, em);
      expect(updateInnovationSharesMock).toHaveBeenCalledTimes(3);
    });

    it('should share if the user has access as collaborator', async () => {
      await sut.shareInnovationsWithOrganisation(jane, scenario.organisations.notSharedOrg.id, em);
      expect(updateInnovationSharesMock).toHaveBeenCalledTimes(2);
    });

    it('should ignore if the innovation is already shared with the organisation', async () => {
      // Only one of the innovations shared with innovTech
      await sut.shareInnovationsWithOrganisation(john, scenario.organisations.innovTechOrg.id, em);
      expect(updateInnovationSharesMock).toHaveBeenCalledTimes(2);
    });

    it("should ignore innovations that haven't been submitted yet", async () => {
      await em.update(
        InnovationEntity,
        { id: scenario.users.johnInnovator.innovations.johnInnovationEmpty.id },
        { submittedAt: null }
      );
      await sut.shareInnovationsWithOrganisation(john, scenario.organisations.notSharedOrg.id, em);
      expect(updateInnovationSharesMock).toHaveBeenCalledTimes(2);
    });

    it('should include previous innovation shares in the list to update', async () => {
      await sut.shareInnovationsWithOrganisation(john, scenario.organisations.notSharedOrg.id, em);
      expect(updateInnovationSharesMock).toHaveBeenCalledWith(
        john,
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        expect.arrayContaining([
          ...scenario.users.johnInnovator.innovations.johnInnovation.sharedOrganisations.map(o => o.id),
          scenario.organisations.notSharedOrg.id
        ]),
        em
      );
      expect(updateInnovationSharesMock).toHaveBeenCalledWith(
        john,
        scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
        expect.arrayContaining([
          ...scenario.users.johnInnovator.innovations.johnInnovationArchived.sharedOrganisations.map(o => o.id),
          scenario.organisations.notSharedOrg.id
        ]),
        em
      );
      expect(updateInnovationSharesMock).toHaveBeenCalledWith(
        john,
        scenario.users.johnInnovator.innovations.johnInnovationEmpty.id,
        expect.arrayContaining([scenario.organisations.notSharedOrg.id]),
        em
      );
    });
  });
});
