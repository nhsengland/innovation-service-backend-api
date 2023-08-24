import { container } from '../../_config';
import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';
import type { DomainService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { ServiceRoleEnum } from '@admin/shared/enums';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';

import { ValidationsHandler } from './validations.handler';

export class InactivateUserRoleValidationsHandler extends ValidationsHandler<AdminOperationEnum.INACTIVATE_USER_ROLE> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.INACTIVATE_USER_ROLE]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    const role = await this.domainService.users.getUserRole(this.data.userId, this.data.userRoleId);

    if (role?.role === ServiceRoleEnum.ASSESSMENT) {
      this.validations.push(await this.validationsService.checkIfAssessmentUserIsNotTheOnlyOne(this.data.userId));
    }

    if (role?.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      this.validations.push(
        await this.validationsService.checkIfLastQualifyingAccessorUserOnOrganisationUnit(role.id)
      );

      this.validations.push(
        await this.validationsService.checkIfNoInnovationsSupportedOnlyByThisUser(role.id)
      );
    }

    if (role?.role === ServiceRoleEnum.ACCESSOR) {
      this.validations.push(
        await this.validationsService.checkIfNoInnovationsSupportedOnlyByThisUser(role.id)
      );
    }

    return this.validations;
  }
}
