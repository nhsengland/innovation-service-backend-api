import Joi from 'joi';

export type ParamsType = {
  userId: string;
};

export const ParamsSchema = Joi.object({
  userId: Joi.string().guid().required()
}).required();

export type BodyType = { type: 'none' } | { type: 'email' } | { type: 'phone'; phoneNumber: string };
export const BodySchema = Joi.object<BodyType>({
  type: Joi.string().valid('none', 'email', 'phone').required(),
  phoneNumber: Joi.alternatives().conditional('type', {
    is: 'phone',
    then: Joi.string().max(20).required(),
    otherwise: Joi.forbidden()
  })
}).required();
