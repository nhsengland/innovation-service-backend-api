import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationFileContextTypeEnum } from '@innovations/shared/enums';
import Joi from 'joi';
import type { InnovationDocumentFileType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  context: { id: string; type: InnovationFileContextTypeEnum };
  name: string;
  description?: string;
  file: InnovationDocumentFileType;
};
export const BodySchema = Joi.object<BodyType>({
  context: Joi.object<BodyType['context']>({
    id: Joi.string().max(100).required(),
    type: Joi.string()
      .valid(...Object.values(InnovationFileContextTypeEnum))
      .required()
  }).required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).optional(),
  file: Joi.object<BodyType['file']>({
    id: Joi.string().max(100).required(),
    name: Joi.string().max(100).required(),
    size: Joi.number().required(),
    extension: Joi.string().max(4).required()
  }).required()
}).required();
