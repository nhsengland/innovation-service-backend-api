import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import type { InnovationFileType } from '../_types/innovation.types';
import { InnovationFileSchema } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type BodyType = {
  message: string;
  file?: InnovationFileType;
};
export const BodySchema = Joi.object<BodyType>({
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  file: InnovationFileSchema
}).required();

export type ParamsType = {
  innovationId: string;
  threadId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  threadId: JoiHelper.AppCustomJoi().string().guid().required()
});
