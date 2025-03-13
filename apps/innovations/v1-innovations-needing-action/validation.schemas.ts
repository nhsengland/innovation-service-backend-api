import type { PaginationQueryParamsType } from '@innovations/shared/helpers';
import { JoiHelper } from '@innovations/shared/helpers';
import type { InnovationListSelectType } from '../_services/innovations.service';

export type QueryParamsType = PaginationQueryParamsType<InnovationListSelectType>;

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.values(['name', 'dueDate']),
  defaultOrder: {}
});
