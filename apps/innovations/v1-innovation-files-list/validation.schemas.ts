import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

enum OrderFields {
  name = 'name',
  createdAt = 'createdAt',
  contextType = 'contextType'
}

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<OrderFields> & {
  name?: string;
  uploadedBy?: ServiceRoleEnum[];
  contextTypes?: InnovationFileContextTypeEnum[];
  contextId?: string;
  units?: string[];
  dateFilter?: {
    field: 'createdAt';
    startDate?: Date;
    endDate?: Date;
  }[];
  fields: 'description'[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(OrderFields)
}).append<QueryParamsType>({
  name: JoiHelper.AppCustomJoi().decodeURIString().trim().optional(),
  uploadedBy: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(ServiceRoleEnum))
    )
    .optional(),
  contextTypes: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(
      JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(InnovationFileContextTypeEnum))
    )
    .optional(),
  contextId: JoiHelper.AppCustomJoi().string().max(100).optional(),
  units: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().uuid()).optional(),
  dateFilter: JoiHelper.AppCustomJoi()
    .stringArrayOfObjects()
    .items(
      Joi.object({
        field: JoiHelper.AppCustomJoi().string().valid('createdAt').required(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional()
      })
    )
    .optional(),
  fields: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(JoiHelper.AppCustomJoi().string().valid('description'))
    .optional()
});
