import { container } from '../_config';
import { In, type EntityManager } from 'typeorm';

import { TestsHelper } from '@admin/shared/tests';

import { OrganisationUnitEntity, UserEntity } from '@admin/shared/entities';

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
      const result = await sut.checkIfNoInnovationsSupportedOnlyByThisUser(
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

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

      const result = await sut.checkIfNoInnovationsSupportedOnlyByThisUser(
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

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

  describe('checkIfUserHasAnyRole', () => {
    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty.id, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator.id, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor.id, ValidationRuleEnum.UserHasAnyAssessmentRole],
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor.id, ValidationRuleEnum.UserHasAnyAccessorRole],
      [
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        scenario.users.aliceQualifyingAccessor.id,
        ValidationRuleEnum.UserHasAnyQualifyingAccessorRole
      ]
    ])('should return invalid if the user has an active %s role', async (roleType, userId, rule) => {
      const validations = await sut.checkIfUserHasAnyRole(userId, [roleType]);

      expect(validations).toMatchObject([
        {
          rule: rule,
          valid: false
        }
      ]);
    });

    it.each([
      [
        ServiceRoleEnum.ADMIN,
        scenario.users.allMighty.id,
        scenario.users.allMighty.roles.admin.id,
        ValidationRuleEnum.UserHasAnyAdminRole
      ],
      [
        ServiceRoleEnum.INNOVATOR,
        scenario.users.adamInnovator.id,
        scenario.users.adamInnovator.roles.innovatorRole.id,
        ValidationRuleEnum.UserHasAnyInnovatorRole
      ],
      [
        ServiceRoleEnum.ASSESSMENT,
        scenario.users.paulNeedsAssessor.id,
        scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
        ValidationRuleEnum.UserHasAnyAssessmentRole
      ],
      [
        ServiceRoleEnum.ACCESSOR,
        scenario.users.samAccessor.id,
        scenario.users.samAccessor.roles.accessorRole.id,
        ValidationRuleEnum.UserHasAnyAccessorRole
      ],
      [
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        scenario.users.aliceQualifyingAccessor.id,
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        ValidationRuleEnum.UserHasAnyQualifyingAccessorRole
      ]
    ])('should return invalid if the user has an inactive %s role', async (roleType, userId, userRoleId, rule) => {
      //inactivate role
      await em.getRepository(UserRoleEntity).update({ id: userRoleId }, { isActive: false });

      const validations = await sut.checkIfUserHasAnyRole(userId, [roleType], undefined, em);

      expect(validations).toMatchObject([
        {
          rule: rule,
          valid: false
        }
      ]);
    });

    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.adamInnovator.id, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, scenario.users.paulNeedsAssessor.id, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.adamInnovator.id, ValidationRuleEnum.UserHasAnyAssessmentRole],
      [ServiceRoleEnum.ACCESSOR, scenario.users.adamInnovator.id, ValidationRuleEnum.UserHasAnyAccessorRole],
      [
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        scenario.users.adamInnovator.id,
        ValidationRuleEnum.UserHasAnyQualifyingAccessorRole
      ]
    ])(`should return valid if the user doesn't have an active or inactive %s role`, async (roleType, userId, rule) => {
      const validations = await sut.checkIfUserHasAnyRole(userId, [roleType]);

      expect(validations).toMatchObject([
        {
          rule: rule,
          valid: true
        }
      ]);
    });

    it('should igore the specified role', async () => {
      const validations = await sut.checkIfUserHasAnyRole(
        scenario.users.adamInnovator.id,
        [ServiceRoleEnum.INNOVATOR],
        scenario.users.adamInnovator.roles.innovatorRole.id
      );

      expect(validations).toMatchObject([
        {
          rule: ValidationRuleEnum.UserHasAnyInnovatorRole,
          valid: true
        }
      ]);
    });
  });

  describe('checkIfUserHasAnyAccessorRoleInOtherOrganisation', () => {
    it('should return valid if the user has no QA/A role in other organisations', async () => {
      const validation = await sut.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
        scenario.users.paulNeedsAssessor.id,
        [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
      );

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation,
        valid: true
      });
    });

    it('should return invalid if the user has a QA role in other organisations', async () => {
      const validation = await sut.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
        scenario.users.aliceQualifyingAccessor.id,
        [scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id]
      );

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation,
        valid: false
      });
    });

    it('should return invalid if the user has an ACCESSOR role in other organisations', async () => {
      const validation = await sut.checkIfUserHasAnyAccessorRoleInOtherOrganisation(scenario.users.samAccessor.id, [
        scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id
      ]);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation,
        valid: false
      });
    });

    it(`should throw an error if the unit doesn't exist`, async () => {
      await expect(() =>
        sut.checkIfUserHasAnyAccessorRoleInOtherOrganisation(scenario.users.adamInnovator.id, [randUuid()])
      ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND));
    });
  });

  describe('checkIfUnitIsActive', () => {
    it('should return valid if the unit is active', async () => {
      const validation = await sut.checkIfUnitIsActive(scenario.users.aliceQualifyingAccessor.roles.qaRole.id);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.OrganisationUnitIsActive,
        valid: true
      });
    });

    it('should return invalid if the unit is inactive', async () => {
      //inactivate unit
      await em
        .getRepository(OrganisationUnitEntity)
        .update(
          { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id },
          { inactivatedAt: new Date() }
        );

      const validation = await sut.checkIfUnitIsActive(scenario.users.aliceQualifyingAccessor.roles.qaRole.id, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.OrganisationUnitIsActive,
        valid: false
      });
    });

    it(`should throw an error if the role doesn't exist`, async () => {
      await expect(() => sut.checkIfUnitIsActive(randUuid())).rejects.toThrowError(
        new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND)
      );
    });
  });

  describe('checkIfUserAlreadyHasRoleInUnit', () => {
    it('should return valid if the user has no role in the unit', async () => {
      const validation = await sut.checkIfUserAlreadyHasRoleInUnit(scenario.users.aliceQualifyingAccessor.id, [
        scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
      ]);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserAlreadyHasRoleInUnit,
        valid: true
      });
    });

    it('should return invalid if the user has a role in the unit', async () => {
      const validation = await sut.checkIfUserAlreadyHasRoleInUnit(scenario.users.aliceQualifyingAccessor.id, [
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
      ]);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserAlreadyHasRoleInUnit,
        valid: false
      });
    });
  });

  describe('checkIfUserIsAccessorInAllUnitsOfOrg', () => {
    it('should return valid if the user has no role in the unit', async () => {
      const validation = await sut.checkIfUserIsAccessorInAllUnitsOfOrg(scenario.users.johnInnovator.id, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserIsAccessorInAllUnitsOfOrg,
        valid: true
      });
    });

    it(`should return valid if the user has a role in some of the organisation's units`, async () => {
      const validation = await sut.checkIfUserIsAccessorInAllUnitsOfOrg(scenario.users.aliceQualifyingAccessor.id, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserIsAccessorInAllUnitsOfOrg,
        valid: true
      });
    });

    it(`should return false if the user has a role in all of the organisation's units`, async () => {
      const validation = await sut.checkIfUserIsAccessorInAllUnitsOfOrg(scenario.users.jamieMadroxAccessor.id, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserIsAccessorInAllUnitsOfOrg,
        valid: false
      });
    });
  });

  describe('checkIfUserCanHaveAssessmentOrAccessorRole', () => {
    it('should return valid if the user has no QA/A role', async () => {
      const validation = await sut.checkIfUserCanHaveAssessmentOrAccessorRole(scenario.users.paulNeedsAssessor.id, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserCanHaveAssessmentOrAccessorRole,
        valid: true
      });
    });

    it(`should return valid if the user has no ASSESSMENT role`, async () => {
      const validation = await sut.checkIfUserCanHaveAssessmentOrAccessorRole(
        scenario.users.aliceQualifyingAccessor.id,
        em
      );

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserCanHaveAssessmentOrAccessorRole,
        valid: true
      });
    });

    it.each([
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty.id],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator.id]
    ])(`should return false if the user is %s`, async (_roleType, userId) => {
      const validation = await sut.checkIfUserCanHaveAssessmentOrAccessorRole(userId, em);

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserCanHaveAssessmentOrAccessorRole,
        valid: false
      });
    });

    it(`should return false if the user has an ASSESSMENT role and is QA/A in all units of org`, async () => {
      await em
        .getRepository(UserRoleEntity)
        .save({
          user: UserEntity.new({ id: scenario.users.jamieMadroxAccessor.id }),
          role: ServiceRoleEnum.ASSESSMENT
        });

      const validation = await sut.checkIfUserCanHaveAssessmentOrAccessorRole(
        scenario.users.jamieMadroxAccessor.id,
        em
      );

      expect(validation).toMatchObject({
        rule: ValidationRuleEnum.UserCanHaveAssessmentOrAccessorRole,
        valid: false
      });
    });
  });
});
