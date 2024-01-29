import { TestsHelper } from '@admin/shared/tests';
import { InactivateUserRoleValidationsHandler } from './inactivate-user-role-validations.handler';
import { ValidationService } from '../../_services/validation.service';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { ServiceRoleEnum } from '@admin/shared/enums';

describe('Admin / _handlers / validations / inactivate-user-role suite', () => {
  let handler: InactivateUserRoleValidationsHandler;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const assessmentCheckSpy = jest
    .spyOn(ValidationService.prototype, 'checkIfAssessmentUserIsNotTheOnlyOne')
    .mockResolvedValue({
      rule: ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne,
      valid: true
    });

  const accessorSupportCheckSpy = jest
    .spyOn(ValidationService.prototype, 'checkIfNoInnovationsSupportedOnlyByThisUser')
    .mockResolvedValue({
      rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
      valid: true
    });

  const lastInUnitCheckSpy = jest
    .spyOn(ValidationService.prototype, 'checkIfLastQualifyingAccessorUserOnOrganisationUnit')
    .mockResolvedValue({
      rule: ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit,
      valid: true
    });

  beforeAll(async () => {
    await testsHelper.init();
  });

  it('should check if ASSESSMENT user is the last one in the service', async () => {
    handler = new InactivateUserRoleValidationsHandler({
      userId: scenario.users.paulNeedsAssessor.id,
      userRoleId: scenario.users.paulNeedsAssessor.roles.assessmentRole.id
    });

    await handler.run();

    expect(assessmentCheckSpy).toHaveBeenCalled();
    expect(handler.validations).toMatchObject([
      {
        rule: ValidationRuleEnum.AssessmentUserIsNotTheOnlyOne,
        valid: true
      }
    ]);
  });

  it.each([
    [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor, scenario.users.samAccessor.roles.accessorRole],
    [
      ServiceRoleEnum.QUALIFYING_ACCESSOR,
      scenario.users.aliceQualifyingAccessor,
      scenario.users.aliceQualifyingAccessor.roles.qaRole
    ]
  ])('should check if %s user is the only one supporting an innovation', async (roleType, user, role) => {
    handler = new InactivateUserRoleValidationsHandler({
      userId: user.id,
      userRoleId: role.id
    });

    await handler.run();

    expect(accessorSupportCheckSpy).toHaveBeenCalled();
    expect(handler.validations).toHaveLength(roleType === ServiceRoleEnum.ACCESSOR ? 1 : 2);
    expect(
      handler.validations.filter(v => v.rule === ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser)
    ).toMatchObject([
      {
        rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
        valid: true
      }
    ]);
  });

  it('should check if QUALIFYING_ACCESSOR user is the last one in the unit', async () => {
    handler = new InactivateUserRoleValidationsHandler({
      userId: scenario.users.aliceQualifyingAccessor.id,
      userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
    });

    await handler.run();

    expect(lastInUnitCheckSpy).toHaveBeenCalled();
    expect(handler.validations).toHaveLength(2);
    expect(
      handler.validations.filter(v => v.rule === ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit)
    ).toMatchObject([
      {
        rule: ValidationRuleEnum.LastQualifyingAccessorUserOnOrganisationUnit,
        valid: true
      }
    ]);
  });
});
