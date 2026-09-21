import { ActivityTypeEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt'
}

export const DateFilterFieldsType = ['createdAt'] as const;
export type DateFilterFieldsType = (typeof DateFilterFieldsType)[number];

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  activityTypes?: ActivityTypeEnum[];
  dateFilters?: {
    field: DateFilterFieldsType;
    startDate?: Date;
    endDate?: Date;
  }[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    activityTypes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(ActivityTypeEnum))
      )
      .optional(),
    dateFilters: JoiHelper.AppCustomJoi()
      .stringArrayOfObjects()
      .items(
        Joi.object({
          field: JoiHelper.AppCustomJoi()
            .string()
            .valid(...DateFilterFieldsType)
            .required(),
          startDate: Joi.date().optional(),
          endDate: Joi.date().optional()
        })
      )
      .optional()
  })
  .required();
