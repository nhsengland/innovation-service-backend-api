import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';


export type BodyType = {
  name: string;
  acronym: string;
  units?: { name: string; acronym: string }[];
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required().description('Name of the organisation.'),
  acronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required().description('Acronym of the organisation.'),
  units: Joi.array().items(Joi.object({
    name: Joi.string().required().description('Name of the organisaion unit.'),
    acronym: Joi.string().required().description('Acronym of the organisation unit.')
  }).required()
  ).optional().description('Organistaion units to create.')
}).required();
