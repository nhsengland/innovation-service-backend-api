import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS, TEXTAREA_LENGTH_LIMIT } from '@admin/shared/constants';
import { JoiHelper } from '@admin/shared/helpers';

export type ParamsType = {
  organisationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  name: string;
  acronym: string;
  summary: string;
};
export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(),
  acronym: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required(),
  summary: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xxl).required()
}).required();
