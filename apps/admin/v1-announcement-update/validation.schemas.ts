import Joi from 'joi';

import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';

// Helpers
const JoiLinkValidation = Joi.object({
  label: Joi.string(),
  url: Joi.string()
});

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: Joi.string().guid().required()
}).required();

export type BodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType['GENERIC'];
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
};
export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).optional(),

  userRoles: Joi.array().optional(),

  params: Joi.object<BodyType['params']>({
    inset: Joi.object<BodyType['params']['inset']>({
      title: Joi.string().optional(),
      content: Joi.string().optional(),
      link: JoiLinkValidation.optional()
    }).optional(),
    content: Joi.string().optional(),
    actionLink: JoiLinkValidation.optional()
  }),

  startsAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .optional()
}).required();
