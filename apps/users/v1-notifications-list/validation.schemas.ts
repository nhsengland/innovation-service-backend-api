import { NotificationContextTypeEnum } from '@users/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@users/shared/helpers';
import Joi from 'joi';

enum orderFields {
  createdAt = 'createdAt'
}


export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  contextTypes: NotificationContextTypeEnum[];
  unreadOnly: boolean;
}


export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) }).append<QueryParamsType>({
  contextTypes: JoiHelper.AppCustomJoi().stringArray().items(
    Joi.string().allow('').valid(...Object.values(NotificationContextTypeEnum))
  ).optional().default([]).description('The context types to filter by'),
  unreadOnly: Joi.boolean().optional().default(false).description('If true, only returns the unread notifications')
}).required()
