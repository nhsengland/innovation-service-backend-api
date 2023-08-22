import { ServiceRoleEnum } from '@admin/shared/enums';
import { TestsHelper } from '@admin/shared/tests';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { AddRoleValidationsHandler } from './add-role-validations.handler';
import { BadRequestError, GenericErrorsEnum } from '@admin/shared/errors';

describe('Admin / _handlers / validations / add-role suite', () => {
  let handler: AddRoleValidationsHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe('Adding ASSESSMENT role', () => {
    beforeAll(async () => {
      handler = new AddRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.ASSESSMENT
      });
      await handler.run();
    });

    it('should check if user has any ADMIN role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAdminRole)).toBeTruthy();
    });

    it('should check if user has any INNOVATOR role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyInnovatorRole)).toBeTruthy();
    });

    it('should check if user has any ASSESSMENT role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAssessmentRole)).toBeTruthy();
    });
  });

  describe('Adding ACCESSOR role', () => {
    beforeAll(async () => {
      handler = new AddRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.ACCESSOR,
        organisationId: scenario.organisations.healthOrg.id
      });
      await handler.run();
    });
    it('should check if user has any ADMIN role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAdminRole)).toBeTruthy();
    });

    it('should check if user has any INNOVATOR role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyInnovatorRole)).toBeTruthy();
    });

    it('should check if user has any QUALIFYING_ACCESSOR role', async () => {
      expect(
        handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyQualifyingAccessorRole)
      ).toBeTruthy();
    });

    it('should check if user has any ACCESSOR or QUALIFYING_ACCESSOR role in any other organisation', async () => {
      expect(
        handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation)
      ).toBeTruthy();
    });
  });

  describe('Adding QUALIFYING_ACCESSOR role', () => {
    beforeAll(async () => {
      handler = new AddRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id,
        role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
        organisationId: scenario.organisations.healthOrg.id
      });
      await handler.run();
    });
    it('should check if user has any ADMIN role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAdminRole)).toBeTruthy();
    });

    it('should check if user has any INNOVATOR role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyInnovatorRole)).toBeTruthy();
    });

    it('should check if user has any ACCESSOR role', async () => {
      expect(handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAccessorRole)).toBeTruthy();
    });

    it('should check if user has any ACCESSOR or QUALIFYING_ACCESSOR role in any other organisation', async () => {
      expect(
        handler.validations.some(v => v.rule === ValidationRuleEnum.UserHasAnyAccessorRoleInOtherOrganisation)
      ).toBeTruthy();
    });
  });

  describe('Invalid payloads', () => {
    it.each([ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR])(
      'Should throw an error if the new role is %s and an organisationId is not given',
      async (roleType: ServiceRoleEnum) => {
        handler = new AddRoleValidationsHandler({
          userId: scenario.users.adamInnovator.id,
          role: roleType
        });

        await expect(() => handler.run()).rejects.toThrowError(
          new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD)
        );
      }
    );
  });
});
