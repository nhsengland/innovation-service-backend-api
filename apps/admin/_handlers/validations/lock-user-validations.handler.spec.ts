import { TestsHelper } from '@admin/shared/tests';
import { LockUserValidationsHandler } from './lock-user-validations.handler';
import { ValidationService } from '../../_services/validation.service';
import { ValidationRuleEnum } from '../../_config/admin-operations.config';
import { ServiceRoleEnum } from '@admin/shared/enums';

describe('Admin / _handlers / validations / lock-user suite', () => {
  let handler: LockUserValidationsHandler;

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

  describe('User with only one role', () => {
    it('should check if ASSESSMENT user is the last one in the service', async () => {
      handler = new LockUserValidationsHandler({
        userId: scenario.users.paulNeedsAssessor.id
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
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.aliceQualifyingAccessor]
    ])('should check if %s user is the only one supporting an innovation', async (roleType, user) => {
      handler = new LockUserValidationsHandler({
        userId: user.id
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
      handler = new LockUserValidationsHandler({
        userId: scenario.users.aliceQualifyingAccessor.id
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

  describe('User with multiple roles', () => {
    it('should group the same validations as invalid if one or more is invalid', async () => {
      jest
        .spyOn(ValidationService.prototype, 'checkIfNoInnovationsSupportedOnlyByThisUser')
        .mockResolvedValueOnce({
          rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
          valid: false
        })
        .mockResolvedValue({
          rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser,
          valid: true
        });

      handler = new LockUserValidationsHandler({ userId: scenario.users.jamieMadroxAccessor.id });
      await handler.run();

      expect(handler.validations).toHaveLength(1);
      expect(handler.validations).toMatchObject([
        { rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser, valid: false }
      ]);
    });

    it('should group the same validations as valid if all are valid', async () => {

      handler = new LockUserValidationsHandler({ userId: scenario.users.jamieMadroxAccessor.id });
      await handler.run();

      expect(handler.validations).toHaveLength(1);
      expect(handler.validations).toMatchObject([
        { rule: ValidationRuleEnum.NoInnovationsSupportedOnlyByThisUser, valid: true }
      ]);
    });
  });
});
