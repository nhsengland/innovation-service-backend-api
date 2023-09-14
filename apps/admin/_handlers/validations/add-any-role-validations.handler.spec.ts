import { ServiceRoleEnum } from '@admin/shared/enums';
import { TestsHelper } from '@admin/shared/tests';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { ValidationService } from '../../_services/validation.service';
import { AddAnyUserRoleValidationsHandler } from './add-any-user-role-validations.handler';

describe('Admin / _handlers / validations / add-any-role suite', () => {
  let handler: AddAnyUserRoleValidationsHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const canHaveAssessmentOrAccessorRoleSpy = jest
    .spyOn(ValidationService.prototype, 'checkIfUserCanHaveAssessmentOrAccessorRole')

  const hasAnyRoleSpy = jest.spyOn(ValidationService.prototype, 'checkIfUserHasAnyRole');

  beforeAll(async () => {
    await testsHelper.init();
  });

  it.each([ServiceRoleEnum.ADMIN, ServiceRoleEnum.INNOVATOR])('should check if user has any %s role', async (roleType) => {
      handler = new AddAnyUserRoleValidationsHandler({
        userId: scenario.users.adamInnovator.id 
      });

      await handler.run();

      expect(hasAnyRoleSpy).toHaveBeenCalledWith(scenario.users.adamInnovator.id, expect.arrayContaining([roleType]))
  })

  it('should check if user can have any ASSESSMENT of ACCESSOR role', async () => {
      handler = new AddAnyUserRoleValidationsHandler({
        userId: scenario.users.aliceQualifyingAccessor.id
      });

      await handler.run();

      expect(canHaveAssessmentOrAccessorRoleSpy).toHaveBeenCalled();
      expect(handler.validations.map(v => v.rule)).toMatchObject([
        ValidationRuleEnum.UserHasAnyAdminRole,
        ValidationRuleEnum.UserHasAnyInnovatorRole,
        ValidationRuleEnum.UserCanHaveAssessmentOrAccessorRole
      ])
  })
});
