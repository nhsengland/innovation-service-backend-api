import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { StatisticsService } from './statistics.service';
import { InnovationActionEntity, InnovationEntity, InnovationSupportEntity } from '@users/shared/entities';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { OrganisationErrorsEnum, UnprocessableEntityError } from '@users/shared/errors';
import { InnovationSupportLogTypeEnum, InnovationSupportStatusEnum, ServiceRoleEnum } from '@users/shared/enums';
import type { DomainContextType } from '@users/shared/types';
import { InnovationSupportLogBuilder } from '@users/shared/tests/builders/innovation-support-log.builder';

describe('Users / _services / statistics service suite', () => {
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

  describe('waitingAssessment', () => {
    it('should count the innovations waiting needs assessment', async () => {
      const result = await sut.waitingAssessment(em);

      expect(result.count).toBe(1);
    });

    it('should count the innovations with overdue assesments', async () => {

      const resultBefore = await sut.waitingAssessment(em);

      expect(resultBefore.overdue).toBe(0);

      // make innovation overdue
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: scenario.users.ottoOctaviusInnovator.innovations.powerSourceInnovation.id },
          { submittedAt: new Date('01/01/2020') }
        );

      const result = await sut.waitingAssessment(em);

      expect(result.overdue).toBe(1);
    });
  });

  describe('assignedInnovations', () => {
    it('should count the innovations assigned to the specified user', async () => {
      const result = await sut.assignedInnovations(scenario.users.paulNeedsAssessor.id, em);

      expect(result.count).toBe(1);
    });

    it('should count the innovations assigned to the specified user with overdue assesments', async () => {
      const resultBefore = await sut.assignedInnovations(scenario.users.paulNeedsAssessor.id, em);

      expect(resultBefore.overdue).toBe(0);

      await em
        .getRepository(InnovationEntity)
        .update(
          { id: scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id },
          { submittedAt: new Date('01/01/2020') }
        );

      const result = await sut.assignedInnovations(scenario.users.paulNeedsAssessor.id, em);

      expect(result.overdue).toBe(1);
    });

    it('should get the total innovations in NEEDS ASSESSMENT', async () => {
      const result = await sut.assignedInnovations(scenario.users.paulNeedsAssessor.id, em);

      expect(result.total).toBe(1);
    });
  });

  describe('innovatonsAssignedToMe', () => {
    it('should get the number of innovations assigned to me (ACCESSOR/QA)', async () => {
      const result = await sut.innovationsAssignedToMe(DTOsHelper.getUserRequestContext(scenario.users.samAccessor));

      expect(result.count).toBe(1);
    });

    it('should get the number of innovations assigned to my unit', async () => {
      const result = await sut.innovationsAssignedToMe(DTOsHelper.getUserRequestContext(scenario.users.samAccessor));

      expect(result.total).toBe(1);
    });

    it('should get the date of the last innovation submission assigned to my unit', async () => {
      const result = await sut.innovationsAssignedToMe(DTOsHelper.getUserRequestContext(scenario.users.samAccessor));

      expect(result.lastSubmittedAt).toStrictEqual(
        new Date(scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.updatedAt)
      );
    });

    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator]
    ])('should throw an error if the request user is %s', async (_userType, user) => {
      await expect(() => sut.innovationsAssignedToMe(DTOsHelper.getUserRequestContext(user))).rejects.toThrowError(
        new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('actionsToReview', () => {
    it('should get the number of actions to review', async () => {
      const result = await sut.actionsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.count).toBe(1);
    });

    it('should get the total number of actions requested and to review', async () => {
      const result = await sut.actionsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.total).toBe(2);
    });

    it('should get the date of the last action submission', async () => {
      const action = scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice;
      const nowDate = new Date();
      await em.getRepository(InnovationActionEntity).update({ id: action.id }, { updatedAt: nowDate });

      const result = await sut.actionsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.lastSubmittedAt).toStrictEqual(new Date(nowDate));
    });

    it('should return lastSubmittedAt as null when there is no action submitted', async () => {
      const result = await sut.actionsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.scottQualifyingAccessor)
      );

      expect(result.lastSubmittedAt).toBeNull();
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])('it should throw an error when the user is %s and has no organisation unit', async () => {
      await expect(() =>
        sut.actionsToReview(
          {
            ...DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
            organisation: undefined
          } as DomainContextType,
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });
  });

  describe('innovationToReview', () => {
    it('should return the date of the latest submitted innovation to review', async () => {
      await em
        .getRepository(InnovationSupportEntity)
        .update(
          { id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id },
          { status: InnovationSupportStatusEnum.UNASSIGNED }
        );

      await new InnovationSupportLogBuilder(em)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id])
        .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
        .setCreatedBy(scenario.users.bartQualifyingAccessor, scenario.users.bartQualifyingAccessor.roles.qaRole)
        .save();

      const nowDate = new Date();
      await em
        .getRepository(InnovationEntity)
        .update({ id: scenario.users.johnInnovator.innovations.johnInnovation.id }, { submittedAt: nowDate });

      const result = await sut.innovationsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.lastSubmittedAt).toStrictEqual(nowDate);
    });

    it('should count all the innovations to review', async () => {
      await em
        .getRepository(InnovationSupportEntity)
        .update(
          { id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id },
          { status: InnovationSupportStatusEnum.UNASSIGNED }
        );

      await new InnovationSupportLogBuilder(em)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id])
        .setInnovation(scenario.users.johnInnovator.innovations.johnInnovation.id)
        .setCreatedBy(scenario.users.bartQualifyingAccessor, scenario.users.bartQualifyingAccessor.roles.qaRole)
        .save();

      await em.getRepository(InnovationSupportEntity).update(
        {
          id: scenario.users.adamInnovator.innovations.adamInnovation.supports.adamInnovationSupportByHealthOrgUnit.id
        },
        { status: InnovationSupportStatusEnum.UNASSIGNED }
      );

      await new InnovationSupportLogBuilder(em)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id])
        .setInnovation(scenario.users.adamInnovator.innovations.adamInnovation.id)
        .setCreatedBy(scenario.users.bartQualifyingAccessor, scenario.users.bartQualifyingAccessor.roles.qaRole)
        .save();

      const result = await sut.innovationsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.count).toBe(2);
    });

    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator]
    ])('should throw an error if the request user is %s', async (_userType, user) => {
      await expect(() => sut.innovationsToReview(DTOsHelper.getUserRequestContext(user), em)).rejects.toThrowError(
        new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });
});
