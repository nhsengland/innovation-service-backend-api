import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';
import { ServiceRoleEnum } from '@admin/shared/enums/user.enums';
import { ValidationsHandler } from './validations.handler';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';

export class AddAnyUserRoleValidationsHandler extends ValidationsHandler<AdminOperationEnum.ADD_ANY_USER_ROLE> {

  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.ADD_ANY_USER_ROLE]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {

    this.validations.push(
      ...(await this.validationsService.checkIfUserHasAnyRole(this.data.userId, [
        ServiceRoleEnum.ADMIN,
        ServiceRoleEnum.INNOVATOR
      ]))
    );

    this.validations.push(await this.validationsService.checkIfUserCanHaveAssessmentOrAccessorRole(this.data.userId));

    return this.validations;
  }
}
