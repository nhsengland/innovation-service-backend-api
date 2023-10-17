import { NotificationCategoryEnum, type NotificationPreferenceEnum, type ServiceRoleEnum } from '../enums';

export const NaNotificationCategories = [
  NotificationCategoryEnum.INNOVATOR_SUBMIT_IR,
  NotificationCategoryEnum.ASSIGN_NA,
  NotificationCategoryEnum.TASK,
  NotificationCategoryEnum.MESSAGE,
  NotificationCategoryEnum.INNOVATION_MANAGEMENT
] as const;
type NaNotificationCategories = (typeof NaNotificationCategories)[number];

export const ANotificationCategories = [
  NotificationCategoryEnum.SUPPORT,
  NotificationCategoryEnum.TASK,
  NotificationCategoryEnum.MESSAGE,
  NotificationCategoryEnum.INNOVATION_MANAGEMENT,
  NotificationCategoryEnum.EXPORT_REQUEST,
  NotificationCategoryEnum.ACCOUNT,
  NotificationCategoryEnum.REMINDER
] as const;
type ANotificationCategories = (typeof ANotificationCategories)[number];

export const QANotificationCategories = [
  NotificationCategoryEnum.SUGGEST_SUPPORT,
  NotificationCategoryEnum.SUPPORT,
  NotificationCategoryEnum.TASK,
  NotificationCategoryEnum.MESSAGE,
  NotificationCategoryEnum.INNOVATION_MANAGEMENT,
  NotificationCategoryEnum.EXPORT_REQUEST,
  NotificationCategoryEnum.ACCOUNT,
  NotificationCategoryEnum.REMINDER
] as const;
type QANotificationCategories = (typeof QANotificationCategories)[number];

export const INotificationCategories = [
  NotificationCategoryEnum.SUPPORT,
  NotificationCategoryEnum.TASK,
  NotificationCategoryEnum.MESSAGE,
  NotificationCategoryEnum.DOCUMENT,
  NotificationCategoryEnum.REMINDER
] as const;
type INotificationCategories = (typeof INotificationCategories)[number];

export type NotificationPreferences =
  | Role2PreferencesType<ServiceRoleEnum.ASSESSMENT>
  | Role2PreferencesType<ServiceRoleEnum.ACCESSOR>
  | Role2PreferencesType<ServiceRoleEnum.QUALIFYING_ACCESSOR>
  | Role2PreferencesType<ServiceRoleEnum.INNOVATOR>;

export type Role2PreferencesType<T extends ServiceRoleEnum> = T extends ServiceRoleEnum.ASSESSMENT
  ? Record<NaNotificationCategories, NotificationPreferenceEnum>
  : T extends ServiceRoleEnum.ACCESSOR
  ? Record<ANotificationCategories, NotificationPreferenceEnum>
  : T extends ServiceRoleEnum.QUALIFYING_ACCESSOR
  ? Record<QANotificationCategories, NotificationPreferenceEnum>
  : T extends ServiceRoleEnum.INNOVATOR
  ? Record<INotificationCategories, NotificationPreferenceEnum>
  : never;
