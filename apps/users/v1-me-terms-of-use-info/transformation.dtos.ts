import type { DateISOType } from '@users/shared/types';

export type ResponseDTO = {
  id: string,
  name: string,
  summary: string,
  releasedAt: null | DateISOType,
  isAccepted: boolean
};
