import Joi from 'joi';

import { AnnouncementParamsType, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementJoiLinkValidation } from '../_services/announcements.schemas';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: Joi.string().guid().required()
}).required();

export type BodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType[keyof AnnouncementParamsType];
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
};
export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).optional(),

  userRoles: Joi.array().optional(),

  params: Joi.object<BodyType['params']>({
    content: Joi.string().optional(),
    link: AnnouncementJoiLinkValidation.optional(),
    filters: Joi.object().optional()
  }),

  startsAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .optional()
}).required();
