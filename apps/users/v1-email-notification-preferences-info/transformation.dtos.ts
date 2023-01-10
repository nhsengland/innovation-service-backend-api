import type { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum } from '@users/shared/enums';

export type ResponseDTO = {
  notificationType: EmailNotificationTypeEnum,
  preference: EmailNotificationPreferenceEnum;
}[]