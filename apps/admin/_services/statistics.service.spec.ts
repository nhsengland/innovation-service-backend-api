import { TestsHelper } from '@admin/shared/tests';

import { InnovationEntity, InnovationSupportEntity, OrganisationUnitEntity } from '@admin/shared/entities';
import { InnovationSupportStatusEnum } from '@admin/shared/enums';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import type { StatisticsService } from './statistics.service';
import SYMBOLS from './symbols';

describe('Admin / _services / announcements service suite', () => {
  let sut: StatisticsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getOrganisationUnitInnovationCounters', () => {
    it('should return the count of innovations in each support status for the given organisation unit', async () => {
      const resultBefore = await sut.getOrganisationUnitInnovationCounters(
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        undefined,
        em
      );

      expect(resultBefore).toMatchObject({ ENGAGING: 4 });

      await em.getRepository(InnovationSupportEntity).save({
        status: InnovationSupportStatusEnum.ENGAGING,
        innovation: InnovationEntity.new({ id: scenario.users.adamInnovator.innovations.adamInnovationEmpty.id }),
        organisationUnit: OrganisationUnitEntity.new({
          id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        })
      });

      const result = await sut.getOrganisationUnitInnovationCounters(
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        undefined,
        em
      );

      expect(result).toMatchObject({ ENGAGING: 5 });
    });

    it('should return the count of innovations in each ongoing support status for the given organisation unit', async () => {
      await em.getRepository(InnovationSupportEntity).save({
        status: InnovationSupportStatusEnum.SUGGESTED,
        innovation: InnovationEntity.new({ id: scenario.users.adamInnovator.innovations.adamInnovationEmpty.id }),
        organisationUnit: OrganisationUnitEntity.new({
          id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        })
      });

      const result = await sut.getOrganisationUnitInnovationCounters(
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        true,
        em
      );

      expect(result).toMatchObject({ ENGAGING: 4 });
    });
  });
});
