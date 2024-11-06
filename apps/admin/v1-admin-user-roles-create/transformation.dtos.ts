import Joi from 'joi';

export type ResponseDTO = { id: string }[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({ id: Joi.string().uuid().description('The role id.').required() })
);
