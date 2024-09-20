import type { PaginationQueryParamsType } from '@admin/shared/helpers';
import { JoiHelper } from '@admin/shared/helpers';

export type AdminQueryParamsType = PaginationQueryParamsType<never>;

export const AdminQueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: [] }).required();
