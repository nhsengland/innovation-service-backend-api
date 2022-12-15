import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';


export type BodyType = {
  organisation: {
    name: string;
    acronym: string;
    units?: { name: string; acronym: string }[];
  }
}
export const BodySchema = Joi.object<BodyType>({
  organisation: Joi.object({
    name: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(),
    acronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required(),
    units: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      acronym: Joi.string().required()
    }).required()
    ).optional()
  }).required()
}).required();
