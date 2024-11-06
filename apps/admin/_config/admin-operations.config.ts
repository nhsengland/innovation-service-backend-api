import { ServiceRoleEnum } from '@admin/shared/enums';
import Joi, { type Schema } from 'joi';
import {
  ActivateUserRoleValidationsHandler,
  AddAnyUserRoleValidationsHandler,
  AddUserRoleValidationsHandler,
  InactivateUserRoleValidationsHandler,
  LockUserValidationsHandler,
  type ValidationsHandler
} from '../_handlers/validations';
import { DeleteUserValidationsHandler } from '../_handlers/validations/delete-user-validations.handler';
import type { AdminValidationsTemplatesType, ValidationResult } from '../types/validation.types';
import { JoiHelper } from '@admin/shared/helpers';

export enum AdminOperationEnum {
  DELETE_USER = 'DELETE_USER',
  LOCK_USER = 'LOCK_USER',
  INACTIVATE_USER_ROLE = 'INACTIVATE_USER_ROLE',
  ACTIVATE_USER_ROLE = 'ACTIVATE_USER_ROLE',
  ADD_USER_ROLE = 'ADD_USER_ROLE',
  ADD_ANY_USER_ROLE = 'ADD_ANY_USER_ROLE'
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
  UserAlreadyHasRoleInUnit = 'UserAlreadyHasRoleInUnit',
  OrganisationUnitIsActive = 'OrganisationUnitIsActive',
  UserIsAccessorInAllUnitsOfOrg = 'UserIsAccessorInAllUnitsOfOrg',
  UserCanHaveAssessmentOrAccessorRole = 'UserCanHaveAssessmentOrAccessorRole'
}

export const ADMIN_OPERATIONS_CONFIG: {
  [key in AdminOperationEnum]: {
    handler: {
      new (...args: any[]): ValidationsHandler<AdminOperationEnum>;
    };
    joiDefinition: Schema;
  };
} = {
  [AdminOperationEnum.DELETE_USER]: {
    handler: DeleteUserValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.LOCK_USER]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [AdminOperationEnum.LOCK_USER]: {
    handler: LockUserValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.LOCK_USER]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [AdminOperationEnum.INACTIVATE_USER_ROLE]: {
    handler: InactivateUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.INACTIVATE_USER_ROLE]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required(),
      userRoleId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [AdminOperationEnum.ACTIVATE_USER_ROLE]: {
    handler: ActivateUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ACTIVATE_USER_ROLE]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required(),
      userRoleId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [AdminOperationEnum.ADD_USER_ROLE]: {
    handler: AddUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ADD_USER_ROLE]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required(),
      role: JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(ServiceRoleEnum))
        .required(),
      organisationUnitIds: Joi.alternatives().conditional('role', {
        is: JoiHelper.AppCustomJoi().string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR),
        then: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).required()
      })
    }).required()
  },

  [AdminOperationEnum.ADD_ANY_USER_ROLE]: {
    handler: AddAnyUserRoleValidationsHandler,
    joiDefinition: Joi.object<AdminValidationsTemplatesType[AdminOperationEnum.ADD_ANY_USER_ROLE]>({
      userId: JoiHelper.AppCustomJoi().string().guid().required()
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
