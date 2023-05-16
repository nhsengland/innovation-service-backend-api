import { JoiHelper, PaginationQueryParamsType } from '@admin/shared/helpers';

export type AdminQueryParamsType = PaginationQueryParamsType<never>;

export const AdminQueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: [] }).required();
