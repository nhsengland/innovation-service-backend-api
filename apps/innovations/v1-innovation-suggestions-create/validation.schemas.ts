import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  description: string;
  organisationUnits: string[];
};
export const BodySchema = Joi.object<BodyType>({
  description: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
  organisationUnits: Joi.array().items(JoiHelper.AppCustomJoi().string()).min(1).required()
}).required();
