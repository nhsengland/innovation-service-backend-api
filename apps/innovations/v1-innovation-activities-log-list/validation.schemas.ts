import { ActivityTypeEnum } from '@innovations/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt'
}

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  activityTypes?: ActivityTypeEnum[];
  startDate?: string;
  endDate?: string;
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    activityTypes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(ActivityTypeEnum)))
      .optional(),
    startDate: JoiHelper.AppCustomJoi().decodeURIDate().optional(),
    endDate: JoiHelper.AppCustomJoi().decodeURIDate().optional()
  })
  .required();
