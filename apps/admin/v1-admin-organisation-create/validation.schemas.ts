import { ORGANISATION_ACRONYM_LENGTH_LIMIT, ORGANISATION_NAME_LENGTH_LIMIT } from '@admin/shared/constants';
import Joi from 'joi';

export type BodyType = {
  organisation: {
    name: string;
    acronym: string;
    units?: { name: string; acronym: string }[];
  }
}
export const BodySchema = Joi.object<BodyType>({
  organisation: Joi.object({
    name: Joi.string().max(ORGANISATION_NAME_LENGTH_LIMIT).required(),
    acronym: Joi.string().max(ORGANISATION_ACRONYM_LENGTH_LIMIT).required(),
    units: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      acronym: Joi.string().required()
    }).required()
    ).optional()
  }).required()
}).required();
