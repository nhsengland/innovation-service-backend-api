import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi, { Schema } from 'joi';
import {
  ActivateUserRoleValidationsHandler,
  AddUserRoleValidationsHandler,
  InactivateUserRoleValidationsHandler,
  LockUserValidationsHandler,
  type ValidationsHandler
} from '../_handlers/validations';
import type { AdminValidationsTemplatesType, ValidationResult } from '../types/validation.types';

export enum AdminOperationEnum {
  LOCK_USER = 'LOCK_USER',
  INACTIVATE_USER_ROLE = 'INACTIVATE_USER_ROLE',
  ACTIVATE_USER_ROLE = 'ACTIVATE_USER_ROLE',
  ADD_USER_ROLE = 'ADD_USER_ROLE'
}

export enum ValidationRuleEnum {
  AssessmentUserIsNotTheOnlyOne = 'AssessmentUserIsNotTheOnlyOne',
  LastQualifyingAccessorUserOnOrganisationUnit = 'LastQualifyingAccessorUserOnOrganisationUnit',
  NoInnovationsSupportedOnlyByThisUser = 'NoInnovationsSupportedOnlyByThisUser',
  UserHasAnyAdminRole = 'UserHasAnyAdminRole',
  UserHasAnyInnovatorRole = 'UserHasAnyInnovatorRole',
  UserHasAnyAssessmentRole = 'UserHasAnyAssessmentRole',
  UserHasAnyAccessorRole = 'UserHasAnyAccessorRole',
  UserHasAnyQualifyingAccessorRole = 'UserHasAnyQualifyingAccessorRole',
  UserHasAnyAccessorRoleInOtherOrganisation = 'UserHasAnyAccessorRoleInOtherOrganisation',
  OrganisationUnitIsActive = 'OrganisationUnitIsActive'
}

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

  [AdminOperationEnum.ACTIVATE_USER_ROLE]: {
    handler: ActivateUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ACTIVATE_USER_ROLE]>({
      userId: Joi.string().guid().required(),
      userRoleId: Joi.string().guid().required()
    }).required()
  },

  [AdminOperationEnum.ADD_USER_ROLE]: {
    handler: AddUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ADD_USER_ROLE]>({
      userId: Joi.string().guid().required(),
      role: Joi.string()
        .valid(...Object.values(ServiceRoleEnum))
        .required(),
      organisationId: Joi.alternatives().conditional('role', {
        is: Joi.string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
        then: Joi.string().guid().required()
      })
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
