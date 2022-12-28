import type { ValidationResult } from '../_config/domain-rules.config';

export type ResponseDTO = {
  validations: ValidationResult[]
};
