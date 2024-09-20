import type { NotificationCategoryType} from '@users/shared/enums';
import { NotificationPreferenceEnum, ServiceRoleEnum } from '@users/shared/enums';
import {
  ANotificationCategories,
  INotificationCategories,
  NaNotificationCategories,
  QANotificationCategories,
  type NotificationPreferences,
  type Role2PreferencesType
} from '@users/shared/types';
import Joi from 'joi';

// Helper
const getPreferenceValidationsByRoleCategories = (
  arr: ReadonlyArray<NotificationCategoryType | 'USER_RESEARCH_SURVEYS'> // USER_RESEARCH_SURVEYS is special cause it's a fake notification category
): Record<string, Joi.Schema> => {
  return arr.reduce((acc, c) => ({ ...acc, [c]: PreferenceValueSchema }), {});
};

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
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.ASSESSMENT>>(
        getPreferenceValidationsByRoleCategories(NaNotificationCategories)
      ).required()
    },
    {
      is: ServiceRoleEnum.ACCESSOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.ACCESSOR>>(
        getPreferenceValidationsByRoleCategories(ANotificationCategories)
      ).required()
    },
    {
      is: ServiceRoleEnum.QUALIFYING_ACCESSOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.QUALIFYING_ACCESSOR>>(
        getPreferenceValidationsByRoleCategories(QANotificationCategories)
      ).required()
    },
    {
      is: ServiceRoleEnum.INNOVATOR,
      then: Joi.object<Role2PreferencesType<ServiceRoleEnum.INNOVATOR>>(
        getPreferenceValidationsByRoleCategories(INotificationCategories)
      ).required(),
      otherwise: Joi.forbidden()
    }
  ])
});
