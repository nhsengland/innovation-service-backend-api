import { container } from '../../_config';

import { ServiceRoleEnum } from '@admin/shared/enums/user.enums';
import type { DomainService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';
import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';

import { ValidationsHandler } from './validations.handler';

export class LockUserValidationsHandler extends ValidationsHandler<AdminOperationEnum.LOCK_USER> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.LOCK_USER]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    const allValidations: ValidationResult[] = [];

    const roles = await this.domainService.users.getUserRoles(this.data.userId);
    const accessorRoles = roles.filter(
      role => role.role === ServiceRoleEnum.ACCESSOR || role.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
    );

    if (roles.find(role => role.role === ServiceRoleEnum.ASSESSMENT)) {
      allValidations.push(await this.validationsService.checkIfAssessmentUserIsNotTheOnlyOne(this.data.userId));
    }

    for (const accessorRole of accessorRoles) {
      if (accessorRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
        allValidations.push(
          await this.validationsService.checkIfLastQualifyingAccessorUserOnOrganisationUnit(accessorRole.id)
        );
      }

      allValidations.push(await this.validationsService.checkIfNoInnovationsSupportedOnlyByThisUser(accessorRole.id));
    }

    // if any of the same type validations is false then the grouped validation is false
    // otherwise all are true so the grouped validation is true
    for (const validationName of [...new Set(allValidations.map(v => v.rule))]) {
      const validations = allValidations.filter(v => v.rule === validationName && !v.valid);
      if (validations.length) {
        this.validations.push({
          rule: validationName,
          valid: false,
          details: validations.filter(v => v.details).flatMap(v => v.details)
        });
      } else {
        this.validations.push({ rule: validationName, valid: true });
      }
    }

    return this.validations;
  }
}
