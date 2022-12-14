import { IdentityOperationsTypeEnum } from '@users/shared/enums';

export const IdentityOperationsParamsTemplates = {
    [IdentityOperationsTypeEnum.LOCK_USER]: { accountEnabled: false },
    [IdentityOperationsTypeEnum.UNLOCK_USER]: { accountEnabled: true },
}
  