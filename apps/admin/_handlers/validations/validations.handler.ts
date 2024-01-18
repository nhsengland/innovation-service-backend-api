import { container } from '../../_config';

import type { ValidationService } from '../../_services/validation.service';
import type { AdminOperationEnum } from '../../_config/admin-operations.config';
import { SYMBOLS } from '../../_services/symbols';
import type { AdminValidationsTemplatesType, ValidationResult } from '../../types/validation.types';

export abstract class ValidationsHandler<AdminOperation extends AdminOperationEnum> {
  data: AdminValidationsTemplatesType[AdminOperation];
  validations: ValidationResult[];

  protected validationsService = container.get<ValidationService>(SYMBOLS.ValidationService);

  constructor(data: AdminValidationsTemplatesType[AdminOperation]) {
    this.data = data;
    this.validations = [];
  }

  abstract run(): Promise<ValidationResult[]>;
}
