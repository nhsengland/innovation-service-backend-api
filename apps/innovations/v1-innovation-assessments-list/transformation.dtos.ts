import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  majorVersion: number;
  minorVersion: number;
  startedAt: Date;
  finishedAt: Date;
}[];

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    majorVersion: Joi.number().integer().required(),
    minorVersion: Joi.number().integer().required(),
    startedAt: Joi.date().required(),
    finishedAt: Joi.date().required()
  })
);
