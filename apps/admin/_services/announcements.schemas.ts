import { AnnouncementParamsType, ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

// Announcement Schema for scheduled status
export type AnnouncementScheduledBodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType['GENERIC'];
  startsAt: Date;
  expiresAt?: Date;
};
export const AnnouncementScheduledBodySchema = Joi.object<AnnouncementScheduledBodyType>({
  title: Joi.string().max(100).required().description('Title of the announcement'),
  userRoles: Joi.array()
    .items(
      Joi.string()
        .valid(...Object.values(ServiceRoleEnum).filter(t => t !== ServiceRoleEnum.ADMIN))
        .required()
        .description('User roles that will see the announcement.')
    )
    .min(1),

  params: Joi.object<AnnouncementScheduledBodyType['params']>({
    inset: Joi.object<AnnouncementScheduledBodyType['params']['inset']>({
      title: Joi.string().optional(),
      content: Joi.string().optional(),
      link: Joi.object({
        label: Joi.string(),
        url: Joi.string()
      }).optional()
    }).optional(),
    content: Joi.string().optional(),
    actionLink: Joi.object<AnnouncementScheduledBodyType['params']['actionLink']>({
      label: Joi.string(),
      url: Joi.string()
    }).optional()
  }),

  startsAt: Joi.date().required(),
  expiresAt: Joi.date().greater(Joi.ref('startsAt')).optional()
}).required();

// Announcement Schema for active status
export type AnnouncementActiveBodyType = {
  expiresAt?: Date;
};
export const AnnouncementActiveBodySchema = Joi.object<AnnouncementActiveBodyType>({
  expiresAt: Joi.date().greater(Joi.ref('$startsAt')).default(null).optional()
}).required();
