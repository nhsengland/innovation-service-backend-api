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
    name: Joi.string().required(),
    acronym: Joi.string().required(),
    units: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      acronym: Joi.string().required()
    }).required()
    ).optional()
  }).required()
}).required();
