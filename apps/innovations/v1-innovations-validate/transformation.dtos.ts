import type { ValidationResult } from '../_services/validation.service';

export type ResponseDTO = {
  validations: ValidationResult[];
};
