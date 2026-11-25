import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';

export type QueryParamsType = PaginationQueryParamsType<'name' | 'dueDate'>;

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.values(['name', 'dueDate']),
  defaultOrder: {}
});
