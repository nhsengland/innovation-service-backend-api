import { ActivityEnum, ActivityTypeEnum } from '@innovations/shared/enums';
import type { ActivityLogListParamsType } from '@innovations/shared/types';
import Joi from 'joi';

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

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  innovation: Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().required()
  }).required(),
  data: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid(...Object.values(ActivityTypeEnum))
          .required(),
        activity: Joi.string().valid(...Object.values(ActivityEnum)),
        date: Joi.date().required(),
        params: Joi.object<ActivityLogListParamsType>().required()
      })
    )
    .required()
});
