import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';
import { ActivityTypeEnum } from '@innovations/shared/enums'
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt',
}

export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  activityTypes?: ActivityTypeEnum;
  activityStartAfter?: string;
  activityStartBefore?: string;
}
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  activityTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(ActivityTypeEnum))).optional(),
  activityStartAfter: Joi.string().length(10).optional(),
  activityStartBefore: Joi.string().length(10).optional(),
}).required();
