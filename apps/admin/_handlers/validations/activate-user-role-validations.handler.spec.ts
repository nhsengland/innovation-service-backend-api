import { TestsHelper } from '@admin/shared/tests';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { ActivateUserRoleValidationsHandler } from './activate-user-role-validations.handler';
import { ServiceRoleEnum } from '@admin/shared/enums';
import { NotFoundError, UserErrorsEnum } from '@admin/shared/errors';
import { randUuid } from '@ngneat/falso';

describe('Admin / _handlers / validations / add-role suite', () => {
  let handler: ActivateUserRoleValidationsHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe.each([
    [ServiceRoleEnum.ADMIN, scenario.users.allMighty.id, scenario.users.allMighty.roles.admin.id],
    [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator.id, scenario.users.adamInnovator.roles.innovatorRole.id]
  ])('Adding %s role', (_roleType: ServiceRoleEnum, userId: string, roleId: string) => {
    beforeAll(async () => {
      handler = new ActivateUserRoleValidationsHandler({
        userId: userId,
        userRoleId: roleId
      });
      await handler.run();
    });

    it.each([
      [ServiceRoleEnum.ADMIN, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.ASSESSMENT, ValidationRuleEnum.UserHasAnyAssessmentRole],
      [ServiceRoleEnum.ACCESSOR, ValidationRuleEnum.UserHasAnyAccessorRole],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, ValidationRuleEnum.UserHasAnyQualifyingAccessorRole]
    ])('should check if user has any %s role', async (_roleType, rule) => {
      expect(handler.validations.some(v => v.rule === rule)).toBeTruthy();
    });
  });

  describe('Adding ASSESSMENT role', () => {
    beforeAll(async () => {
      handler = new ActivateUserRoleValidationsHandler({
        userId: scenario.users.paulNeedsAssessor.id,
        userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
      });
      await handler.run();
    });

    it.each([
      [ServiceRoleEnum.ADMIN, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.ASSESSMENT, ValidationRuleEnum.UserHasAnyAssessmentRole]
    ])('should check if user has any %s role', async (_roleType, rule) => {
      expect(handler.validations.some(v => v.rule === rule)).toBeTruthy();
    });
  });

  describe('Adding ACCESSOR role', () => {
    beforeAll(async () => {
      handler = new ActivateUserRoleValidationsHandler({
        userId: scenario.users.samAccessor.id,
        userRoleId: scenario.users.samAccessor.roles.accessorRole.id
      });
      await handler.run();
    });

    it.each([
      [ServiceRoleEnum.ADMIN, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, ValidationRuleEnum.UserHasAnyQualifyingAccessorRole]
    ])('should check if user has any %s role', async (_roleType, rule) => {
      expect(handler.validations.some(v => v.rule === rule)).toBeTruthy();
    });

    it('should check if user has any ACCESSOR or QUALIFYING_ACCESSOR role in any other organisation', async () => {
      expect(
        handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation)
      ).toBeTruthy();
    });
  });

  describe('Adding QUALIFYING_ACCESSOR role', () => {
    beforeAll(async () => {
      handler = new ActivateUserRoleValidationsHandler({
        userId: scenario.users.aliceQualifyingAccessor.id,
        userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
      });
      await handler.run();
    });

    it.each([
      [ServiceRoleEnum.ADMIN, ValidationRuleEnum.UserHasAnyAdminRole],
      [ServiceRoleEnum.INNOVATOR, ValidationRuleEnum.UserHasAnyInnovatorRole],
      [ServiceRoleEnum.ACCESSOR, ValidationRuleEnum.UserHasAnyAccessorRole]
    ])('should check if user has any %s role', async (_roleType, rule) => {
      expect(handler.validations.some(v => v.rule === rule)).toBeTruthy();
    });

    it('should check if user has any ACCESSOR or QUALIFYING_ACCESSOR role in any other organisation', async () => {
      expect(
        handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation)
      ).toBeTruthy();
    });
  });

  it(`should throw an error if the role doesn't exist`, async () => {
    handler = new ActivateUserRoleValidationsHandler({
      userId: scenario.users.aliceQualifyingAccessor.id,
      userRoleId: randUuid()
    });
    await expect(() => handler.run()).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND));
  });
});
