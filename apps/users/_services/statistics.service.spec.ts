import { container } from '../_config';

import { InnovationEntity, InnovationSupportEntity } from '@users/shared/entities';
import {
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  ServiceRoleEnum
} from '@users/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@users/shared/errors';
import { TestsHelper } from '@users/shared/tests';
import { InnovationSupportLogBuilder } from '@users/shared/tests/builders/innovation-support-log.builder';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import type { StatisticsService } from './statistics.service';
import SYMBOLS from './symbols';

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
      await expect(() => sut.innovationsAssignedToMe(DTOsHelper.getUserRequestContext(user))).rejects.toThrow(
        new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('getTasksCounter', () => {
    it.each([
      [
        'QA',
        [InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.CANCELLED],
        scenario.users.aliceQualifyingAccessor,
        { OPEN: 1, DONE: 2, CANCELLED: 0 }
      ],
      [
        'NA',
        [InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.DONE],
        scenario.users.seanNeedsAssessor,
        { OPEN: 1, DONE: 0 }
      ]
    ])(
      'as %s should get my organisation tasks counter for the given innovation and $s',
      async (_label, statuses, user, res) => {
        const tasksCounter = await sut.getTasksCounter(DTOsHelper.getUserRequestContext(user), statuses);

        expect(tasksCounter).toEqual({ ...res, lastUpdatedAt: expect.any(Date) });
      }
    );

    it("shouldn't return status that wasn't requested", async () => {
      const tasksCounter = await sut.getTasksCounter(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        [InnovationTaskStatusEnum.OPEN] // alice also has a done task
      );

      expect((tasksCounter as any)[InnovationTaskStatusEnum.CANCELLED]).toBeUndefined();
      expect((tasksCounter as any)[InnovationTaskStatusEnum.DONE]).toBeUndefined();
      expect((tasksCounter as any)[InnovationTaskStatusEnum.DECLINED]).toBeUndefined();
    });

    it('should throw bad request if status missing', async () => {
      await expect(() =>
        sut.getTasksCounter(DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor), [])
      ).rejects.toThrow(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    });
  });

  describe('innovationToReview', () => {
    it('should return the date of the latest submitted innovation to review', async () => {
      await em
        .getRepository(InnovationSupportEntity)
        .update(
          { id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id },
          { status: InnovationSupportStatusEnum.SUGGESTED }
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
          { status: InnovationSupportStatusEnum.SUGGESTED }
        );

      await em.getRepository(InnovationSupportEntity).update(
        {
          id: scenario.users.adamInnovator.innovations.adamInnovation.supports.adamInnovationSupportByHealthOrgUnit.id
        },
        { status: InnovationSupportStatusEnum.SUGGESTED }
      );

      const result = await sut.innovationsToReview(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(result.count).toBe(3);
    });

    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator]
    ])('should throw an error if the request user is %s', async (_userType, user) => {
      await expect(() => sut.innovationsToReview(DTOsHelper.getUserRequestContext(user), em)).rejects.toThrow(
        new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('getCountInnovationsNeedingAction', () => {
    it('should get the number of innovations that need action', async () => {
      const innovationSuggestedInThePast = scenario.users.tristanInnovator.innovations.innovationSuggestedInThePast;
      const innovationWaitingForUpdate = scenario.users.tristanInnovator.innovations.innovationUpdateInPast;
      const organisationUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;

      console.log('innovationSuggestedInThePast', innovationSuggestedInThePast.id);
      console.log('innovationWaitingForUpdate', innovationWaitingForUpdate.id);

      const suggestedInnovations = await sut.getCountInnovationsNeedingAction(organisationUnit.id, em);

      expect(suggestedInnovations).toEqual(2);
    });
  });
});
