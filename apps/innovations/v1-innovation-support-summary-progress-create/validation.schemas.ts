import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import Joi from 'joi';
import { InnovationFileDocumentSchema, InnovationFileDocumentType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});

export type BodyType = {
  title: string;
  description: string;
  document?: InnovationFileDocumentType;
};
export const BodySchema = Joi.object<BodyType>({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  document: InnovationFileDocumentSchema.optional()
}).required();
