import { ServiceRoleEnum } from '@admin/shared/enums';
import { TestsHelper } from '@admin/shared/tests';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { AddUserRoleValidationsHandler } from './add-user-role-validations.handler';
import { BadRequestError, GenericErrorsEnum } from '@admin/shared/errors';

describe('Admin / _handlers / validations / add-user-role suite', () => {
  let handler: AddUserRoleValidationsHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe.each([ServiceRoleEnum.ADMIN, ServiceRoleEnum.INNOVATOR])('Adding %s role', (roleType: ServiceRoleEnum) => {
    beforeAll(async () => {
      handler = new AddUserRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: roleType
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
      handler = new AddUserRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.ASSESSMENT
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
      handler = new AddUserRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.ACCESSOR,
        organisationUnitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
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

    it('should check if user already has a role in the same unit', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserAlreadyHasRoleInUnit)).toBeTruthy();
    });
  });

  describe('Adding QUALIFYING_ACCESSOR role', () => {
    beforeAll(async () => {
      handler = new AddUserRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
        organisationUnitIds: [scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id]
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

    it('should check if user already has a role in the same unit', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserAlreadyHasRoleInUnit)).toBeTruthy();
    });
  });

  describe('Invalid payloads', () => {
    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR])(
      'Should throw an error if the new role is %s and an organisationId is not given',
      async (roleType: ServiceRoleEnum) => {
        handler = new AddUserRoleValidationsHandler({
          userId: scenario.users.adamInnovator.id,
          role: roleType
        });

        await expect(() => handler.run()).rejects.toThrow(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
      }
    );
  });
});
