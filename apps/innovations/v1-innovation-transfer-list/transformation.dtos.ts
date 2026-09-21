import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  email: string;
  innovation: {
    id: string;
    name: string;
    owner?: string;
  };
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    email: Joi.string().required(),
    innovation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required(),
      owner: Joi.string().optional()
    }).required()
  })
);
