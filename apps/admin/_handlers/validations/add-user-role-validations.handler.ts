import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';
import { ServiceRoleEnum } from '@admin/shared/enums/user.enums';
import { BadRequestError, GenericErrorsEnum } from '@admin/shared/errors';
import { ValidationsHandler } from './validations.handler';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';

export class AddUserRoleValidationsHandler extends ValidationsHandler<AdminOperationEnum.ADD_USER_ROLE> {
  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.ADD_USER_ROLE]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    switch (this.data.role) {
      case ServiceRoleEnum.ADMIN:
      case ServiceRoleEnum.INNOVATOR:
        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(this.data.userId, Object.values(ServiceRoleEnum)))
        );
        break;

      case ServiceRoleEnum.ASSESSMENT:
        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(this.data.userId, [
            ServiceRoleEnum.ADMIN,
            ServiceRoleEnum.INNOVATOR,
            ServiceRoleEnum.ASSESSMENT
          ]))
        );
        break;
      case ServiceRoleEnum.ACCESSOR:
        if (!this.data.organisationUnitId) {
          throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
        }

        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(this.data.userId, [
            ServiceRoleEnum.ADMIN,
            ServiceRoleEnum.INNOVATOR,
            ServiceRoleEnum.QUALIFYING_ACCESSOR
          ]))
        );
        this.validations.push(
          await this.validationsService.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
            this.data.userId,
            this.data.organisationUnitId
          )
        );
        this.validations.push(
          await this.validationsService.checkIfUserAlreadyHasRoleInUnit(this.data.userId, this.data.organisationUnitId)
        );
        break;
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        if (!this.data.organisationUnitId) {
          throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
        }

        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(this.data.userId, [
            ServiceRoleEnum.ADMIN,
            ServiceRoleEnum.INNOVATOR,
            ServiceRoleEnum.ACCESSOR
          ]))
        );
        this.validations.push(
          await this.validationsService.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
            this.data.userId,
            this.data.organisationUnitId
          )
        );
        break;
    }

    return this.validations;
  }
}
