import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants'


export type ParamsType = {
  organisationId: string
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  name: string,
  acronym: string
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(),
  acronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required()
}).required();
