import Joi from 'joi';

import type { AnnouncementParamsType, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementTypeEnum } from '@admin/shared/enums';
import { AnnouncementJoiLinkValidation } from '../_services/announcements.schemas';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';
import { JoiHelper } from '@admin/shared/helpers';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: JoiHelper.AppCustomJoi().string().guid().required()
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
  title: JoiHelper.AppCustomJoi().string().max(100).optional(),

  userRoles: Joi.array().optional(),

  params: Joi.object<BodyType['params']>({
    content: JoiHelper.AppCustomJoi().string().optional(),
    link: AnnouncementJoiLinkValidation.optional()
  }),

  startsAt: Joi.date().optional(),
  expiresAt: Joi.date().optional(),
  type: JoiHelper.AppCustomJoi()
    .string()
    .valid(...Object.values(AnnouncementTypeEnum))
    .optional(),
  filters: Joi.array()
    .items(
      Joi.object<FilterPayload>({
        section: JoiHelper.AppCustomJoi().string().required(),
        question: JoiHelper.AppCustomJoi().string().required(),
        answers: Joi.array().items(JoiHelper.AppCustomJoi().string()).min(1).required()
      })
    )
    .optional(),
  sendEmail: Joi.boolean().optional()
}).required();
