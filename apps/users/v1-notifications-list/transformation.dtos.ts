import type { InnovationStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@users/shared/enums';
import type { DateISOType } from '@users/shared/types';

export type ResponseDTO = {
  count: number,
  data: {
    id: string;
    innovation: { id: string; name: string, status: InnovationStatusEnum };
    contextType: NotificationContextTypeEnum;
    contextDetail: NotificationContextDetailEnum;
    contextId: string;
    createdAt: DateISOType;
    readAt: DateISOType;
    params: Record<string, unknown>; // used to be NotificationParamsType in legacy API;
  }[]
}