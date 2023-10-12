import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationFileDocumentSchema, type InnovationFileDocumentType } from '../_types/innovation.types';

export type BodyType = {
  subject: string;
  message: string;
  file?: InnovationFileDocumentType;
  followerUserRoleIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  file: InnovationFileDocumentSchema,
  followerUserRoleIds: Joi.array().items(Joi.string().guid()).required()
}).required();

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});
