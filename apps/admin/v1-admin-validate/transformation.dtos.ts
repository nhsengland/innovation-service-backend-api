import type { ValidationResult } from '../_config/admin-operations.config';

export type ResponseDTO = {
  validations: ValidationResult[];
};
