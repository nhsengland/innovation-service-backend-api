import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  acronym: string;
  isActive?: boolean;
  organisationUnits?: { id: string; name: string; acronym: string; isActive?: boolean }[];
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    acronym: Joi.string().required(),
    isActive: Joi.boolean().optional(),
    organisationUnits: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      acronym: Joi.string().required(),
      isActive: Joi.boolean().optional()
    }).optional()
  })
);
