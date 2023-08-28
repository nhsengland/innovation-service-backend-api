import type { ServiceRoleEnum } from "@admin/shared/enums";
import type { AdminOperationEnum, ValidationRuleEnum } from "../_config/admin-operations.config";

export type ValidationResult = {
  rule: ValidationRuleEnum;
  valid: boolean;
};

export type AdminValidationsTemplatesType = {
  [AdminOperationEnum.LOCK_USER]: {
    userId: string;
  };

  [AdminOperationEnum.INACTIVATE_USER_ROLE]: {
    userId: string;
    userRoleId: string;
  };

  [AdminOperationEnum.ACTIVATE_USER_ROLE]: {
    userId: string;
    userRoleId: string;
  };

  [AdminOperationEnum.ADD_USER_ROLE]: {
    userId: string;
    role: ServiceRoleEnum,
    organisationUnitIds?: string[]
  };
}
