import Joi from 'joi';

export type ResponseDTO = {
  unitId: string;
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({ unitId: Joi.string().uuid().required() });
