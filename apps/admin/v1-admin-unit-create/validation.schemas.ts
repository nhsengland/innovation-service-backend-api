import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';

export type ParamsType = {
  organisationId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required().description('Id of the organisation to which the unit will belong to.')
}).required()


export type BodyType = {
  name: string;
  acronym: string;
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.unit_name).required().description('Name of the organisation unit.'),
  acronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.unit_acronym).required().description('Acronym of the organisation unit.')
}).required()
