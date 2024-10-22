import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';
import { JoiHelper } from '@admin/shared/helpers';

export type ParamsType = {
  organisationId: string;
  organisationUnitId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: JoiHelper.AppCustomJoi().string().guid().required(),
  organisationUnitId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  name: string;
  acronym: string;
};
export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.unit_name).required(),
  acronym: JoiHelper.AppCustomJoi().string().max(ORGANISATIONS_LENGTH_LIMITS.unit_acronym).required()
}).required();
