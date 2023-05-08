import { JoiHelper, PaginationQueryParamsType } from '@admin/shared/helpers';

enum orderFields {
  createdAt = 'createdAt'
}

export type QueryParamsType = PaginationQueryParamsType<orderFields>;

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({})
  .required();
