import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  invitedAt: Date;
  innovation: {
    id: string;
    name: string;
  };
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    invitedAt: Joi.date().required(),
    innovation: Joi.object({
      id: Joi.string().uuid().required(),
      name: Joi.string().required()
    })
  })
);
