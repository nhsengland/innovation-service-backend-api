import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  context: { id: string; type: InnovationFileContextTypeEnum; name?: string };
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
  file: { id: string; name: string; size?: number; extension: string; url: string };
  canDelete: boolean;
};

export const ResponseBodySchema = Joi.object({
  id: Joi.string().uuid().required(),
  context: Joi.object({
    id: Joi.string().uuid().required(),
    type: Joi.string().valid(...Object.values(InnovationFileContextTypeEnum)),
    name: Joi.string().optional()
  }),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  createdAt: Joi.date().required(),
  createdBy: Joi.object({
    name: Joi.string().required(),
    role: Joi.string()
      .valid(...Object.values(ServiceRoleEnum))
      .required(),
    isOwner: Joi.boolean().optional(),
    orgUnitName: Joi.string().optional()
  }),
  file: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    size: Joi.number().optional(),
    extension: Joi.string().required(),
    url: Joi.string().required()
  }).required(),
  canDelete: Joi.boolean().required()
});
