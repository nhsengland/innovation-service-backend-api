import { TestsHelper } from '@admin/shared/tests';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { DeleteUserValidationsHandler } from './delete-user-validations.handler';

describe('Admin / _handlers / validations / delete-user suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  it("shouldn't give error if user is innovation", async () => {
    const handler = new DeleteUserValidationsHandler({
      userId: scenario.users.johnInnovator.id
    });

    await handler.run();

    expect(handler.validations).toMatchObject([]);
  });

  it('should return validation error if assessment user', async () => {
    const handler = new DeleteUserValidationsHandler({
      userId: scenario.users.paulNeedsAssessor.id
    });

    await handler.run();

    expect(handler.validations).toMatchObject([{ rule: ValidationRuleEnum.UserHasAnyAssessmentRole, valid: false }]);
  });

  it('should return validation error if accessor user', async () => {
    const handler = new DeleteUserValidationsHandler({
      userId: scenario.users.samAccessor.id
    });

    await handler.run();

    expect(handler.validations).toMatchObject([{ rule: ValidationRuleEnum.UserHasAnyAccessorRole, valid: false }]);
  });

  it('should return validation error if qualifying accessor user', async () => {
    const handler = new DeleteUserValidationsHandler({
      userId: scenario.users.aliceQualifyingAccessor.id
    });

    await handler.run();

    expect(handler.validations).toMatchObject([{ rule: ValidationRuleEnum.UserHasAnyAccessorRole, valid: false }]);
  });

  it('should return validation error if admin user', async () => {
    const handler = new DeleteUserValidationsHandler({
      userId: scenario.users.allMighty.id
    });

    await handler.run();

    expect(handler.validations).toMatchObject([{ rule: ValidationRuleEnum.UserHasAnyAdminRole, valid: false }]);
  });
});
