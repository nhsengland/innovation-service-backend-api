import type { SubscriptionConfig } from '@users/shared/types';

export type ResponseDTO = {
  id: string;
  innovation: { id: string; name: string };
  config: SubscriptionConfig;
  scheduledNotification?: {
    sendDate: Date;
    params: { inApp: Record<string, unknown>; email: Record<string, unknown> };
  };
}[];
