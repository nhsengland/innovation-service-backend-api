import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { InnovationFileSchema, type InnovationFileType } from '../_types/innovation.types';
import { JoiHelper } from '@innovations/shared/helpers';

export type BodyType = {
  subject: string;
  message: string;
  file?: InnovationFileType;
  followerUserRoleIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  subject: JoiHelper.AppCustomJoi().string().max(200).required(),
  message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required(),
  file: InnovationFileSchema,
  followerUserRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).required()
}).required();

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
});
