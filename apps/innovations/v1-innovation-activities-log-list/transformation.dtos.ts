import type { ActivityEnum, ActivityTypeEnum } from '@innovations/shared/enums';
import type { ActivityLogListParamsType } from '@innovations/shared/types';

export type ResponseDTO = {
  count: number;
  innovation: { id: string; name: string };
  data: {
    type: ActivityTypeEnum;
    activity: ActivityEnum;
    date: Date;
    params: ActivityLogListParamsType;
  }[];
};
