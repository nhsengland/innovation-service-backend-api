import { AnnouncementStatusEnum, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  title: string;
  userRoles: ServiceRoleEnum[];
  params: null | Record<string, unknown>;
  startsAt: Date;
  expiresAt: null | Date;
  status: AnnouncementStatusEnum;
  filters: null | FilterPayload[];
  sendEmail: boolean;
  type: AnnouncementTypeEnum;
};

export const ResponseBodySchema = Joi.object({
  id: Joi.string().uuid().required(),
  title: Joi.string().required(),
  userRoles: Joi.array()
    .items(Joi.string().valid(...Object.values(ServiceRoleEnum)))
    .required(),
  params: Joi.object().allow(null).required(),
  startsAt: Joi.date().required(),
  expiresAt: Joi.date().allow(null).required(),
  status: Joi.string().valid(...Object.values(AnnouncementStatusEnum)),
  filters: Joi.object({
    section: Joi.string().required(),
    question: Joi.string().required(),
    answers: Joi.array().items(Joi.string())
  })
    .allow(null)
    .required(),
  sendEmail: Joi.boolean().required(),
  type: Joi.string().valid(...Object.values(AnnouncementTypeEnum))
});
