import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export const AnnouncementJoiLinkValidation = Joi.object({
  label: Joi.string(),
  url: Joi.string()
});

// Announcement Schema for scheduled status
export type AnnouncementScheduledBodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType[keyof AnnouncementParamsType];
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
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

  params: Joi.alternatives([
    Joi.object<AnnouncementParamsType['GENERIC']>({
      content: Joi.string().required(),
      link: AnnouncementJoiLinkValidation.optional()
    }),
    Joi.object<AnnouncementParamsType['FILTERED']>({
      content: Joi.string().required(),
      link: AnnouncementJoiLinkValidation.optional(),
      filters: Joi.object().required()
    })
  ]),

  startsAt: Joi.date().required(),
  expiresAt: Joi.date().greater(Joi.ref('startsAt')).optional(),
  type: Joi.string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .required()
}).required();

// Announcement Schema for active status
export type AnnouncementActiveBodyType = {
  expiresAt?: Date;
};
export const AnnouncementActiveBodySchema = Joi.object<AnnouncementActiveBodyType>({
  expiresAt: Joi.date().greater(Joi.ref('$startsAt')).default(null).optional()
}).required();
