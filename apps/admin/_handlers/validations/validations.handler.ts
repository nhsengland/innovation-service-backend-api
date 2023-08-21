
import type { AdminOperationEnum } from 'apps/admin/_config/admin-operations.config';
import { container } from '../../_config';

import { SYMBOLS } from '../../_services/symbols';
import type { AdminValidationsTemplatesType, ValidationResult } from 'apps/admin/types/validation.types';
import type { ValidationService } from 'apps/admin/_services/validation.service';

export abstract class ValidationsHandler<AdminOperation extends AdminOperationEnum> {
  data: AdminValidationsTemplatesType[AdminOperation];
  validations: ValidationResult[];
  validationsService: ValidationService;

  constructor(data: AdminValidationsTemplatesType[AdminOperation]) {
    this.data = data;
    this.validations = [];
    this.validationsService = container.get<ValidationService>(SYMBOLS.ValidationService);
  }

  abstract run(): Promise<ValidationResult[]>;
}
