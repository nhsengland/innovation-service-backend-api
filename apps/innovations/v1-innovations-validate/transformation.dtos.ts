import Joi from 'joi';
import { type ValidationResult } from '../_services/validation.service';

export type ResponseDTO = {
  validations: ValidationResult[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  validations: Joi.array().items(
    Joi.object({
      rule: Joi.string().required(),
      valid: Joi.boolean().required(),
      details: Joi.any().optional()
    })
  )
});
