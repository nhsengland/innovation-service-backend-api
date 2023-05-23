import type { EmailNotificationPreferenceEnum, EmailNotificationType } from '@users/shared/enums';

export type ResponseDTO = {
  notificationType: EmailNotificationType;
  preference: EmailNotificationPreferenceEnum;
}[];
