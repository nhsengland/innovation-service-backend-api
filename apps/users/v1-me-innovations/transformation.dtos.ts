import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  name: string;
  collaboratorsCount: number;
  expirationTransferDate: Date | null;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required(),
    collaboratorsCount: Joi.number().integer().required(),
    expirationTransferDate: Joi.date().allow(null).required()
  })
);
