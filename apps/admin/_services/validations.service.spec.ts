import { container } from '../_config';
import { In, type EntityManager } from 'typeorm';

import { TestsHelper } from '@admin/shared/tests';

import { UserEntity } from '@admin/shared/entities';

import { InnovationSupportStatusEnum, ServiceRoleEnum, UserStatusEnum } from '@admin/shared/enums';
import SYMBOLS from './symbols';
import type { ValidationService } from './validation.service';
import { ValidationRuleEnum } from '../_config/admin-operations.config';
import { UserRoleEntity } from '@admin/shared/entities';
import { UserBuilder } from '@admin/shared/tests/builders/user.builder';
import { randUuid } from '@ngneat/falso';
import { NotFoundError, UserErrorsEnum } from '@admin/shared/errors';
import { InnovationSupportBuilder } from '@admin/shared/tests/builders/innovation-support.builder';

describe('Admin / _services / validations service suite', () => {
  let sut: ValidationService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<ValidationService>(SYMBOLS.ValidationService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('checkIfAssessmentUserIsNotTheOnlyOne', () => {
    it('should be valid if the user is not the only NA in the service', async () => {
      const result = await sut.checkIfAssessmentUserIsNotTheOnlyOne(scenario.users.paulNeedsAssessor.id, em);

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne,
        valid: true
      });
    });
    it('should be invalid if the user is the only NA in the service', async () => {
      //lock all NAs except paul
      const needsAssessorIds = (
        await em
          .createQueryBuilder(UserEntity, 'user')
          .select(['user.id'])
          .innerJoin('user.serviceRoles', 'userRole')
          .where('userRole.role = :assessmentRole', { assessmentRole: ServiceRoleEnum.ASSESSMENT })
          .andWhere('user.id != :userId', { userId: scenario.users.paulNeedsAssessor.id })
          .getMany()
      ).map(u => u.id);

      await em
        .getRepository(UserEntity)
        .update({ id: In(needsAssessorIds) }, { status: UserStatusEnum.LOCKED, lockedAt: new Date() });

      const result = await sut.checkIfAssessmentUserIsNotTheOnlyOne(scenario.users.paulNeedsAssessor.id, em);

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne,
        valid: false
      });
    });
  });

  describe('checkIfLastQualifyingAccessorUserOnOrganisationUnit', () => {
    it('should be valid if the user is not the only QA in the unit', async () => {
      // ensure unit has another QA
      await new UserBuilder(em)
        .setName('New Qualifying Accessor')
        .addRole(
          ServiceRoleEnum.QUALIFYING_ACCESSOR,
          'qaRole',
          scenario.organisations.healthOrg.id,
          scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        )
        .save();

      const result = await sut.checkIfLastQualifyingAccessorUserOnOrganisationUnit(
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit,
        valid: true
      });
    });

    it('should be invalid if the user is the only QA in the unit', async () => {
      //delete all QAs except alice
      const qARoleIds = (
        await em
          .createQueryBuilder(UserRoleEntity, 'userRole')
          .select(['userRole.id'])
          .innerJoin('userRole.organisationUnit', 'unit')
          .where('userRole.role = :qARole', { qARole: ServiceRoleEnum.QUALIFYING_ACCESSOR })
          .andWhere('unit.id = :unitId', {
            unitId: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisationUnit?.id
          })
          .andWhere('userRole.id != :userRoleId', {
            userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
          })
          .getMany()
      ).map(u => u.id);

      await em.getRepository(UserRoleEntity).update({ id: In(qARoleIds) }, { deletedAt: new Date() });

      const result = await sut.checkIfLastQualifyingAccessorUserOnOrganisationUnit(
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit,
        valid: false
      });
    });

    it(`should throw an error if the user role doesn't exist`, async () => {
      await expect(() => sut.checkIfLastQualifyingAccessorUserOnOrganisationUnit(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND)
      );
    });
  });

  describe('checkIfNoInnovationsSupportedOnlyByThisUser', () => {
    it('should be valid if there is no innovation only supported by the user', async () => {
      const result = await sut.checkIfNoInnovationsSupportedOnlyByThisUser(scenario.users.aliceQualifyingAccessor.roles.qaRole.id, em)

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
        valid: true
      });
      
    });
    it('should be invalid if there is an innovation only supported by the user', async () => {
      // make support with only one user
      await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(scenario.users.johnInnovator.innovations.johnInnovationEmpty.id)
        .setOrganisationUnit(scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id)
        .setAccessors([scenario.users.aliceQualifyingAccessor])
        .save();

      const result = await sut.checkIfNoInnovationsSupportedOnlyByThisUser(scenario.users.aliceQualifyingAccessor.roles.qaRole.id, em)

      expect(result).toMatchObject({
        rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
        valid: false 
      });
    });

    it(`should throw an error if the user role doesn't exist`, async () => {
      await expect(() => sut.checkIfNoInnovationsSupportedOnlyByThisUser(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND)
      );
    });
  });
});
