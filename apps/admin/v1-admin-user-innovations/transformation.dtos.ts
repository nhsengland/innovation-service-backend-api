import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  isOwner: boolean;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    isOwner: Joi.boolean().required()
  })
);
