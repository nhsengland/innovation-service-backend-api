import type { InnovationStatusEnum, NotificationCategoryType, NotificationDetailType } from '@users/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    innovation: { id: string; name: string; status: InnovationStatusEnum; ownerName: string };
    contextType: NotificationCategoryType;
    contextDetail: NotificationDetailType;
    contextId: string;
    createdAt: Date;
    readAt: Date | null;
    params: Record<string, unknown>; // used to be NotificationParamsType in legacy API;
  }[];
};
