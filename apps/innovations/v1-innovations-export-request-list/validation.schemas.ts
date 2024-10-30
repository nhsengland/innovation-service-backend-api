import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt'
}

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  statuses?: InnovationExportRequestStatusEnum[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    statuses: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationExportRequestStatusEnum))
      )
      .optional()
  })
  .required();
