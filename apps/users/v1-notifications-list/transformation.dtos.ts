import type {
  InnovationStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@users/shared/enums';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    innovation: { id: string; name: string; status: InnovationStatusEnum; ownerName: string };
    contextType: NotificationContextTypeEnum;
    contextDetail: NotificationContextDetailEnum;
    contextId: string;
    createdAt: Date;
    readAt: Date;
    params: Record<string, unknown>; // used to be NotificationParamsType in legacy API;
  }[];
};
