import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';
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
};
export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(),
  acronym: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required()
}).required();
