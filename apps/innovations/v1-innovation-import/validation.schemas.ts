import Joi from 'joi';

export type BodyType = {
  format: 'excel' | 'json';
  file?: string; // Base64 Excel (required if format='excel')
  payload?: Record<string, Record<string, any>>; // JSON (required if format='json')
};

export const BodySchema = Joi.object<BodyType>({
  format: Joi.string().valid('excel', 'json').required(),
  file: Joi.when('format', {
    is: 'excel',
    then: Joi.string().required(),
    otherwise: Joi.forbidden()
  }),
  payload: Joi.when('format', {
    is: 'json',
    then: Joi.object().unknown(true).required(),
    otherwise: Joi.forbidden()
  })
}).required();
