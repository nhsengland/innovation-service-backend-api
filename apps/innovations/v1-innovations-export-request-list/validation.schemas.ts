import { JoiHelper, PaginationQueryParamsType } from '@innovations/shared/helpers';
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt',
}

export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type QueryParamsType = PaginationQueryParamsType<orderFields>;
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).required();

