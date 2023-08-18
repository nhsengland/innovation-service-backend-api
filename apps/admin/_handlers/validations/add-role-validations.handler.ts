import { GenericErrorsEnum, NotImplementedError } from '@admin/shared/errors';
import type { AdminOperationEnum, ValidationResult } from 'apps/admin/_config/admin-operations.config';
import type { AdminValidationsTemplatesType } from 'apps/admin/types/validation.types';
import { ValidationsHandler } from './validations.handler';

export class AddRoleValidationsHandler extends ValidationsHandler<AdminOperationEnum.ADD_USER_ROLE> {
  constructor(inputData: AdminValidationsTemplatesType[AdminOperationEnum.ADD_USER_ROLE]) {
    super(inputData);
  }

  async run(): Promise<ValidationResult[]> {
    throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR);
  }
}
