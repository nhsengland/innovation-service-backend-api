import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationFileContextTypeEnum } from '@innovations/shared/enums';
import Joi from 'joi';
import type { InnovationFileType } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  context: { id: string; type: InnovationFileContextTypeEnum };
  name: string;
  description?: string;
  file: InnovationFileType['file'];
};
export const BodySchema = Joi.object<BodyType>({
  context: Joi.object<BodyType['context']>({
    id: JoiHelper.AppCustomJoi().string().max(100).required(),
    type: JoiHelper.AppCustomJoi()
      .string()
      .valid(...Object.values(InnovationFileContextTypeEnum))
      .required()
  }).required(),
  name: JoiHelper.AppCustomJoi().string().max(100).required(),
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).optional(),
  file: Joi.object<BodyType['file']>({
    id: JoiHelper.AppCustomJoi().string().max(100).required(),
    name: JoiHelper.AppCustomJoi().string().max(100).required(),
    size: Joi.number().required(),
    extension: JoiHelper.AppCustomJoi().string().max(4).required()
  }).required()
}).required();
