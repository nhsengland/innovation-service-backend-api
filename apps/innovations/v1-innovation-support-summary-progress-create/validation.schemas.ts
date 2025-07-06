import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { JoiHelper } from '@innovations/shared/helpers';
import type { SupportLogProgressUpdate } from '@innovations/shared/types';
import Joi from 'joi';
import type { InnovationFileType } from '../_types/innovation.types';
import { InnovationFileSchema } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
});

export type BodyType = {
  description: string;
  document?: InnovationFileType;
  createdAt: Date;
} & SupportLogProgressUpdate['params'];

const BaseSchema = Joi.object<BodyType>({
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  document: InnovationFileSchema.optional(),
  createdAt: Joi.date().max('now')
});

export const BodySchema = Joi.alternatives([
  BaseSchema.append({ title: JoiHelper.AppCustomJoi().string().max(100).required() }),
  BaseSchema.append({
    categories: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().max(100)).required(),
    whetherToNotify: JoiHelper.AppCustomJoi().string().max(3).optional()
  }),
  BaseSchema.append({
    category: JoiHelper.AppCustomJoi().string().max(100).required(),
    subCategories: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().max(100)).required()
  })
]).required();
