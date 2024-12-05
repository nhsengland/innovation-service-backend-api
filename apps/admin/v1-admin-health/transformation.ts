import Joi from 'joi';

export type ResponseDTO = {
  status: 'OK' | 'NOK';
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({ status: Joi.string().valid('OK', 'NOK').required() });
