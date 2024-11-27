import { InnovationStatusEnum, NotificationCategoryType, NotificationDetailType } from '@users/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    innovation: { id: string; name: string; status: InnovationStatusEnum; ownerName?: string };
    contextType: NotificationCategoryType;
    contextDetail: NotificationDetailType;
    contextId: string;
    createdAt: Date;
    readAt: Date | null;
    params: Record<string, unknown>; // used to be NotificationParamsType in legacy API;
  }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  count: Joi.number().integer().required(),
  data: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      innovation: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationStatusEnum))
          .required(),
        ownerName: Joi.string()
      }),
      contextType: Joi.string().valid(...NotificationCategoryType),
      contextDetail: Joi.string().valid(...NotificationDetailType),
      contextId: Joi.string().required(),
      createdAt: Joi.date().required(),
      readAt: Joi.date().allow(null).required(),
      params: Joi.object()
    })
  )
});
