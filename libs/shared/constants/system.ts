import { ServiceRoleEnum } from '../enums';

export const NA_UNIT_ID = '00000000-0000-0000-0001-000000000001';
export const ADMIN_CRON_ID = '00000000-0000-0000-0000-000000000000';

export const SYSTEM_CONTEXT = {
  currentRole: { id: '00000000-0000-0000-0000-000000000000', role: ServiceRoleEnum.ADMIN },
  id: '00000000-0000-0000-0000-000000000000',
  identityId: '00000000-0000-0000-0000-000000000000'
} as const;
