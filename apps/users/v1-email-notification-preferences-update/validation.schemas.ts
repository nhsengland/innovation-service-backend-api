import { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum } from '@users/shared/enums';
import Joi from 'joi';


export type BodyType = {
  notificationType: EmailNotificationTypeEnum,
  preference: EmailNotificationPreferenceEnum;
}[]

export const BodySchema = Joi.array().items(Joi.object<BodyType[0]>({
  notificationType: Joi.string().valid(...Object.values(EmailNotificationTypeEnum)).required(),
  preference: Joi.string().valid(...Object.values(EmailNotificationPreferenceEnum)).required(),
})).min(1).required();
