import Joi from 'joi';

import type { AnnouncementParamsType, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementTypeEnum } from '@admin/shared/enums';
import { AnnouncementJoiLinkValidation } from '../_services/announcements.schemas';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: Joi.string().guid().required()
}).required();

export type BodyType = {
  title: string;
  userRoles: ServiceRoleEnum[];
  params: AnnouncementParamsType;
  startsAt: Date;
  expiresAt?: Date;
  type: AnnouncementTypeEnum;
  filters?: FilterPayload[];
  sendEmail?: boolean;
};
export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).optional(),

  userRoles: Joi.array().optional(),

  params: Joi.object<BodyType['params']>({
    content: Joi.string().optional(),
    link: AnnouncementJoiLinkValidation.optional()
  }),

  startsAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  type: Joi.string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .optional(),
  filters: Joi.array()
    .items(
      Joi.object<FilterPayload>({
        section: Joi.string().required(),
        question: Joi.string().required(),
        answers: Joi.array().items(Joi.string()).min(1).required()
      })
    )
    .optional(),
  sendEmail: Joi.boolean().optional()
}).required();
