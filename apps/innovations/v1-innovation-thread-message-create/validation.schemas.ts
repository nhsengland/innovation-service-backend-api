import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import type { InnovationFileType } from '../_types/innovation.types';
import { InnovationFileSchema } from '../_types/innovation.types';

export type BodyType = {
  message: string;
  file?: InnovationFileType;
};
export const BodySchema = Joi.object<BodyType>({
  message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xxl).trim().required(),
  file: InnovationFileSchema
}).required();

export type ParamsType = {
  innovationId: string;
  threadId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required()
});
