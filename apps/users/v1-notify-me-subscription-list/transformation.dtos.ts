import type { SubscriptionResponseDTO } from '../_types/notify-me.types';

export type ResponseDTO = {
  innovationId: string;
  name: string;
  count: number;
  subscriptions?: SubscriptionResponseDTO[];
}[];
