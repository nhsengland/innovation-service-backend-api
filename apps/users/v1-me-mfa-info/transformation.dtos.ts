import Joi from 'joi';

export type ResponseDTO = { type: 'none' } | { type: 'email' } | { type: 'phone'; phoneNumber?: string };

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  type: Joi.string().valid('none', 'email', 'phone').required(),
  phoneNumber: Joi.string().optional()
});
