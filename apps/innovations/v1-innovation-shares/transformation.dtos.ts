import Joi from 'joi';

export type ResponseDTO = {
  organisation: {
    id: string;
    name: string;
    acronym: null | string;
  };
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    organisation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      acronym: Joi.string().allow(null).required()
    })
  })
);
