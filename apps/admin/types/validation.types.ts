import type { AdminOperationEnum } from "../_config/admin-operations.config";

export type AdminValidationsTemplatesType = {
  [AdminOperationEnum.LOCK_USER]: {
    userId: string;
  };

  [AdminOperationEnum.INACTIVATE_USER_ROLE]: {
    userId: string;
    userRoleId: string;
  };
}