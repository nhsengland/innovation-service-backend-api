import type { ServiceRoleEnum } from '@admin/shared/enums';
import type { AdminOperationEnum } from '../_config/admin-operations.config';

export type AdminValidationsTemplatesType = {
  [AdminOperationEnum.LOCK_USER]: {
    userId: string;
  };

  [AdminOperationEnum.INACTIVATE_USER_ROLE]: {
    userId: string;
    userRoleId: string;
  };

  [AdminOperationEnum.ADD_USER_ROLE]: {
    userId: string;
    role: ServiceRoleEnum;
    organisationId?: string;
  };
};
