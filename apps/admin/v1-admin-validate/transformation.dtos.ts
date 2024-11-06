import Joi from 'joi';
import type { ValidationResult } from '../types/validation.types';
import { ValidationRuleEnum } from '../_config/admin-operations.config';

export type ResponseDTO = {
  validations: ValidationResult[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  validations: Joi.array().items(
    Joi.object({
      rule: Joi.string()
        .valid(...Object.values(ValidationRuleEnum))
        .required(),
      valid: Joi.boolean().required(),
      details: Joi.any().optional()
    })
  )
});
