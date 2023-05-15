import { EmailNotificationPreferenceEnum, EmailNotificationType } from '@users/shared/enums';
import Joi from 'joi';

export type BodyType = {
  notificationType: EmailNotificationType;
  preference: EmailNotificationPreferenceEnum;
}[];

export const BodySchema = Joi.array()
  .items(
    Joi.object<BodyType[0]>({
      notificationType: Joi.string().valid(...EmailNotificationType).required(),
      preference: Joi.string()
        .valid(...Object.values(EmailNotificationPreferenceEnum))
        .required()
    })
  )
  .min(1)
  .required();
