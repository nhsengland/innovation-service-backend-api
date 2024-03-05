import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { JoiHelper } from '@innovations/shared/helpers';
import type { SupportLogProgressUpdate } from '@innovations/shared/types';
import Joi from 'joi';
import { InnovationFileSchema, InnovationFileType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});

export type BodyType = {
  description: string;
  document?: InnovationFileType;
  createdAt?: Date;
} & SupportLogProgressUpdate['params'];

const BaseSchema = Joi.object<BodyType>({
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  document: InnovationFileSchema.optional(),
  createdAt: Joi.date().max('now')
});

export const BodySchema = Joi.alternatives([
  BaseSchema.append({ title: Joi.string().max(100).required() }),
  BaseSchema.append({ categories: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().max(100)).required() }),
  BaseSchema.append({
    category: Joi.string().max(100).required(),
    subCategories: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().max(100)).required()
  })
]).required();
