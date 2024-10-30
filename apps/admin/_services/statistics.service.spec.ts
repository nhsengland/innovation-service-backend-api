import { TestsHelper } from '@admin/shared/tests';

import { InnovationSupportStatusEnum } from '@admin/shared/enums';
import { InnovationAssessmentBuilder } from '@admin/shared/tests/builders/innovation-assessment.builder';
import { InnovationSupportBuilder } from '@admin/shared/tests/builders/innovation-support.builder';
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
    const healthOrgUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;
    const innovation = scenario.users.adamInnovator.innovations.adamInnovationEmpty;
    const naUser = scenario.users.paulNeedsAssessor;

    it('should return the count of innovations in each support status for the given organisation unit', async () => {
      const resultBefore = await sut.getOrganisationUnitInnovationCounters(healthOrgUnit.id, undefined, em);

      expect(resultBefore).toMatchObject({ ENGAGING: 4 });

      const assessment = await new InnovationAssessmentBuilder(em)
        .setInnovation(innovation.id)
        .setNeedsAssessor(naUser.id)
        .setUpdatedBy(naUser.id)
        .setFinishedAt()
        .suggestOrganisationUnits(healthOrgUnit)
        .save();

      await new InnovationSupportBuilder(em)
        .setInnovation(innovation.id)
        .setMajorAssessment(assessment.id)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setOrganisationUnit(healthOrgUnit.id)
        .setCreatedAndUpdatedBy(
          scenario.users.aliceQualifyingAccessor.id,
          scenario.users.aliceQualifyingAccessor.roles['qaRole'].id
        )
        .save();

      const result = await sut.getOrganisationUnitInnovationCounters(
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        undefined,
        em
      );

      expect(result).toMatchObject({ ENGAGING: 5 });
    });

    it('should return the count of innovations in each ongoing support status for the given organisation unit', async () => {
      const assessment = await new InnovationAssessmentBuilder(em)
        .setInnovation(innovation.id)
        .setNeedsAssessor(naUser.id)
        .setUpdatedBy(naUser.id)
        .setFinishedAt()
        .suggestOrganisationUnits(healthOrgUnit)
        .save();

      await new InnovationSupportBuilder(em)
        .setInnovation(innovation.id)
        .setMajorAssessment(assessment.id)
        .setStatus(InnovationSupportStatusEnum.SUGGESTED)
        .setOrganisationUnit(healthOrgUnit.id)
        .setCreatedAndUpdatedBy(
          scenario.users.aliceQualifyingAccessor.id,
          scenario.users.aliceQualifyingAccessor.roles['qaRole'].id
        )
        .save();

      const result = await sut.getOrganisationUnitInnovationCounters(
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        true,
        em
      );

      expect(result).toMatchObject({ ENGAGING: 4 });
    });
  });
});
