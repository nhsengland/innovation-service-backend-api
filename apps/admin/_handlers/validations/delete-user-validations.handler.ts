import { container } from '../../_config';

import { ServiceRoleEnum } from '@admin/shared/enums/user.enums';
import type { DomainService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { ValidationRuleEnum, type AdminOperationEnum } from '../../_config/admin-operations.config';
import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';

import { ValidationsHandler } from './validations.handler';

export class DeleteUserValidationsHandler extends ValidationsHandler<AdminOperationEnum.DELETE_USER> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.DELETE_USER]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    const roles = await this.domainService.users.getUserRoles(this.data.userId);
    if (roles.find(role => role.role === ServiceRoleEnum.ASSESSMENT)) {
      this.validations.push({ rule: ValidationRuleEnum.UserHasAnyAssessmentRole, valid: false });
    }

    if (
      roles.find(role => role.role === ServiceRoleEnum.QUALIFYING_ACCESSOR || role.role === ServiceRoleEnum.ACCESSOR)
    ) {
      this.validations.push({ rule: ValidationRuleEnum.UserHasAnyAccessorRole, valid: false });
    }

    if (roles.find(role => role.role === ServiceRoleEnum.ADMIN)) {
      this.validations.push({ rule: ValidationRuleEnum.UserHasAnyAdminRole, valid: false });
    }

    return this.validations;
  }
}
