import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';
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
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<OrderFields> & {
  name?: string;
  uploadedBy?: ServiceRoleEnum[];
  contextTypes?: InnovationFileContextTypeEnum[];
  contextId?: string;
  organisations?: string[];
  dateFilter?: {
    field: 'createdAt';
    startDate?: Date;
    endDate?: Date;
  }[];
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(OrderFields)
}).append<QueryParamsType>({
  name: JoiHelper.AppCustomJoi().decodeURIString().trim().optional(),
  uploadedBy: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(Joi.string().valid(...Object.values(ServiceRoleEnum)))
    .optional(),
  contextTypes: JoiHelper.AppCustomJoi()
    .stringArray()
    .items(Joi.string().valid(...Object.values(InnovationFileContextTypeEnum)))
    .optional(),
  contextId: Joi.string().max(100).optional(),
  organisations: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().uuid()).optional(),
  dateFilter: JoiHelper.AppCustomJoi()
    .stringArrayOfObjects()
    .items(
      Joi.object({
        field: Joi.string().valid('createdAt').required(),
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional()
      })
    )
    .optional()
});
