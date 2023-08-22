import { ADMIN_OPERATIONS_CONFIG, type AdminOperationEnum } from '../../_config/admin-operations.config';
import type { Schema } from 'joi';

export class ValidationHandlersHelper {
  static handlerJoiDefinition(operation: AdminOperationEnum): Schema {
    return ADMIN_OPERATIONS_CONFIG[operation].joiDefinition;
  }
}
