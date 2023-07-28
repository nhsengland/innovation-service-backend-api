import { JoiHelper, type PaginationQueryParamsType } from '@innovations/shared/helpers';
import Joi from 'joi';

enum orderFields {
  'subject' = 'subject',
  'createdAt' = 'createdAt',
  'messageCount' = 'messageCount',
  'latestMessageCreatedAt' = 'latestMessageCreatedAt'
}

export type ParamsType = { innovationId: string };
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});

export type QueryParamsType = PaginationQueryParamsType<orderFields>;
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
}).required();
