import { container } from '../../_config';
import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';
import type { DomainService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';

import { ValidationsHandler } from './validations.handler';
import { BadRequestError, GenericErrorsEnum, NotFoundError, UserErrorsEnum } from '@admin/shared/errors';
import { ServiceRoleEnum } from '@admin/shared/enums';

export class ActivateUserRoleValidationsHandler extends ValidationsHandler<AdminOperationEnum.ACTIVATE_USER_ROLE> {
  private domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.ACTIVATE_USER_ROLE]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    const role = await this.domainService.users.getUserRole(this.data.userId, this.data.userRoleId);

    if (!role) {
      throw new NotFoundError(UserErrorsEnum.USER_ROLE_NOT_FOUND);
    }

    switch (role.role) {
      case ServiceRoleEnum.ADMIN:
      case ServiceRoleEnum.INNOVATOR:
        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(
            this.data.userId,
            Object.values(ServiceRoleEnum),
            role.id
          ))
        );
        break;

      case ServiceRoleEnum.ASSESSMENT:
        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(
            this.data.userId,
            [ServiceRoleEnum.ADMIN, ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ASSESSMENT],
            role.id
          ))
        );
        break;

      case ServiceRoleEnum.ACCESSOR:

        /*c8 ignore next 3*/
        if (!role.organisationUnit) {
          throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
        }

        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(
            this.data.userId,
            [ServiceRoleEnum.ADMIN, ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
            role.id
          ))
        );
        this.validations.push(
          await this.validationsService.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
            this.data.userId,
            [role.organisationUnit.id]
          )
        );
        this.validations.push(await this.validationsService.checkIfUnitIsActive(role.id));
        break;

      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        /*c8 ignore next 3*/
        if (!role.organisationUnit) {
          throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
        }

        this.validations.push(
          ...(await this.validationsService.checkIfUserHasAnyRole(
            this.data.userId,
            [ServiceRoleEnum.ADMIN, ServiceRoleEnum.INNOVATOR, ServiceRoleEnum.ACCESSOR],
            role.id
          ))
        );
        this.validations.push(
          await this.validationsService.checkIfUserHasAnyAccessorRoleInOtherOrganisation(
            this.data.userId,
            [role.organisationUnit.id]
          )
        );
        this.validations.push(await this.validationsService.checkIfUnitIsActive(role.id));
        break;
    }

    return this.validations;
  }
}
