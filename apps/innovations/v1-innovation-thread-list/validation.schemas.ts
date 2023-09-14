import { ServiceRoleEnum } from '@innovations/shared/enums';
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
  following?: boolean;
};
export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(OrderFields)
})
  .append({
    subject: Joi.string().max(50).optional()
  })
  .when('$userType', {
    is: Joi.string().valid(ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR, ServiceRoleEnum.ASSESSMENT),
    then: Joi.object({
      following: Joi.boolean().optional()
    })
  })
  .required();
