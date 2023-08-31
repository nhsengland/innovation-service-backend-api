import { JoiHelper, type PaginationQueryParamsType } from '@innovations/shared/helpers';
import Joi from 'joi';

enum OrderFields {
  'subject' = 'subject',
  'messageCount' = 'messageCount',
  'latestMessageCreatedAt' = 'latestMessageCreatedAt'
}

export type ParamsType = { innovationId: string };
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});

export type QueryParamsType = PaginationQueryParamsType<OrderFields> & {
  subject?: string;
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(OrderFields)
})
  .append({ subject: Joi.string().max(50).optional() })
  .required();
