import Joi from 'joi';

import { NotificationCategoryType } from '@users/shared/enums';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import { JoiHelper } from '@users/shared/helpers';

enum orderFields {
  createdAt = 'createdAt'
}

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  contextTypes: NotificationCategoryType[];
  unreadOnly: boolean;
};

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({
  orderKeys: Object.keys(orderFields)
})
  .append<QueryParamsType>({
    contextTypes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(
        JoiHelper.AppCustomJoi()
          .string()
          .allow('')
          .valid(...NotificationCategoryType)
      )
      .optional()
      .default([])
      .description('The context types to filter by'),
    unreadOnly: Joi.boolean().optional().default(false).description('If true, only returns the unread notifications')
  })
  .required();
