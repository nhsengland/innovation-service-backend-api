import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi, { Schema } from 'joi';
import { InactivateUserRoleValidationsHandler } from '../_handlers/validations/inactivate-user-role-validations.handler';
import { LockUserValidationsHandler } from '../_handlers/validations/lock-user-validations.handler';
import type { ValidationsHandler } from '../_handlers/validations/validations.handler';
import type { AdminValidationsTemplatesType } from '../types/validation.types';

export enum AdminOperationEnum {
  LOCK_USER = 'LOCK_USER',
  INACTIVATE_USER_ROLE = 'INACTIVATE_USER_ROLE',
  ADD_USER_ROLE = 'ADD_USER_ROLE'
}

export enum ValidationRuleEnum {
  AssessmentUserIsNotTheOnlyOne = 'AssessmentUserIsNotTheOnlyOne',
  LastQualifyingAccessorUserOnOrganisationUnit = 'LastQualifyingAccessorUserOnOrganisationUnit',
  NoInnovationsSupportedOnlyByThisUser = 'NoInnovationsSupportedOnlyByThisUser'
}

export type ValidationResult = {
  rule: ValidationRuleEnum;
  valid: boolean;
};

export const ADMIN_OPERATIONS_CONFIG: {
  [key in AdminOperationEnum]: {
    handler: {
      new (...args: any[]): ValidationsHandler<AdminOperationEnum>;
    };
    joiDefinition: Schema;
  };
} = {
  [AdminOperationEnum.LOCK_USER]: {
    handler: LockUserValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.LOCK_USER]>({
      userId: Joi.string().guid().required()
    }).required()
  },

  [AdminOperationEnum.INACTIVATE_USER_ROLE]: {
    handler: InactivateUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.INACTIVATE_USER_ROLE]>({
      userId: Joi.string().guid().required(),
      userRoleId: Joi.string().guid().required()
    }).required()
  },

  [AdminOperationEnum.ADD_USER_ROLE]: {
    handler: undefined as any,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ADD_USER_ROLE]>({
      userId: Joi.string().guid().required(),
      role: Joi.string()
        .valid(...Object.values(ServiceRoleEnum))
        .required(),
      organisationId: Joi.string().guid().optional()
    }).required()
  }
};

export const validationsHelper = async <T extends AdminOperationEnum>(
  operation: T,
  inputData: AdminValidationsTemplatesType[T]
): Promise<ValidationResult[]> => {
  const res = await new ADMIN_OPERATIONS_CONFIG[operation].handler(inputData).run();

  return res;
};
