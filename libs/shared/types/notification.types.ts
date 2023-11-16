import { NotificationCategoryType, NotificationPreferenceEnum, ServiceRoleEnum } from '../enums';

export const NaNotificationCategories = ['TASK', 'MESSAGES', 'NEEDS_ASSESSMENT', 'INNOVATION_MANAGEMENT'] as const;
type NaNotificationCategories = (typeof NaNotificationCategories)[number];

export const ANotificationCategories = [
  'TASK',
  'SUPPORT',
  'MESSAGES',
  'ADMIN',
  'AUTOMATIC',
  'INNOVATION_MANAGEMENT'
] as const;
type ANotificationCategories = (typeof ANotificationCategories)[number];

export const QANotificationCategories = [
  'TASK',
  'SUPPORT',
  'MESSAGES',
  'ORGANISATION_SUGGESTIONS',
  'ADMIN',
  'AUTOMATIC',
  'INNOVATION_MANAGEMENT'
] as const;
type QANotificationCategories = (typeof QANotificationCategories)[number];

export const INotificationCategories = ['TASK', 'SUPPORT', 'MESSAGES', 'DOCUMENTS', 'AUTOMATIC'] as const;
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

export const generatePreferencesObject = <T extends ServiceRoleEnum>(
  arr: ReadonlyArray<NotificationCategoryType>,
  value = NotificationPreferenceEnum.YES
): Role2PreferencesType<T> => {
  return arr.reduce((acc, c) => ({ ...acc, [c]: value }), {}) as Role2PreferencesType<T>;
};
