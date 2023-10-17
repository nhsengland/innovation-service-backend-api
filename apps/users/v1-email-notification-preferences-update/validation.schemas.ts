import { NotificationPreferenceEnum, ServiceRoleEnum } from '@users/shared/enums';
import type { NotificationPreferences, Role2PreferencesType } from '@users/shared/types';
import Joi from 'joi';

export type BodyType = {
  preferences: NotificationPreferences;
};

const PreferenceValueSchema = Joi.string()
  .valid(...Object.values(NotificationPreferenceEnum))
  .required();
export const BodySchema = Joi.object<BodyType>({
  preferences: Joi.when('$role', [
    {
      is: ServiceRoleEnum.ASSESSMENT,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.ASSESSMENT>>({
        ASSIGN_NA: PreferenceValueSchema,
        INNOVATION_MANAGEMENT: PreferenceValueSchema,
        INNOVATOR_SUBMIT_IR: PreferenceValueSchema,
        MESSAGE: PreferenceValueSchema,
        TASK: PreferenceValueSchema
      }).required()
    },
    {
      is: ServiceRoleEnum.ACCESSOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.ACCESSOR>>({
        ACCOUNT: PreferenceValueSchema,
        EXPORT_REQUEST: PreferenceValueSchema,
        INNOVATION_MANAGEMENT: PreferenceValueSchema,
        MESSAGE: PreferenceValueSchema,
        REMINDER: PreferenceValueSchema,
        SUPPORT: PreferenceValueSchema,
        TASK: PreferenceValueSchema
      }).required()
    },
    {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.QUALIFYING_ACCESSOR>>({
        SUGGEST_SUPPORT: PreferenceValueSchema,
        ACCOUNT: PreferenceValueSchema,
        EXPORT_REQUEST: PreferenceValueSchema,
        INNOVATION_MANAGEMENT: PreferenceValueSchema,
        MESSAGE: PreferenceValueSchema,
        REMINDER: PreferenceValueSchema,
        SUPPORT: PreferenceValueSchema,
        TASK: PreferenceValueSchema
      }).required()
    },
    {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.INNOVATOR>>({
        DOCUMENT: PreferenceValueSchema,
        MESSAGE: PreferenceValueSchema,
        REMINDER: PreferenceValueSchema,
        SUPPORT: PreferenceValueSchema,
        TASK: PreferenceValueSchema
      }).required(),
      otherwise: Joi.forbidden()
    }
  ])
});
