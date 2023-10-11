import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import type { InnovationDocumentFileType } from '../_types/innovation.types';

export type BodyType = {
  subject: string;
  message: string;
  file?: InnovationDocumentFileType;
  followerUserRoleIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  file: Joi.object({
    id: Joi.string().max(100).required(),
    name: Joi.string().max(100).required(),
    size: Joi.number().required(),
    extension: Joi.string().max(4).required()
  }),
  followerUserRoleIds: Joi.array().items(Joi.string().guid()).required()
}).required();

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});
