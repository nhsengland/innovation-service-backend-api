import Joi from 'joi';

import { ServiceRoleEnum } from '@users/shared/enums';
import type { PaginationQueryParamsType } from '@users/shared/helpers';
import { JoiHelper } from '@users/shared/helpers';

enum orderFields {
  createdAt = 'createdAt'
}

export type QueryParamsType = PaginationQueryParamsType<orderFields> & {
  userTypes: ServiceRoleEnum[];
  organisationUnitId?: string;
  onlyActive?: boolean;
  fields: 'email'[];
};

export const QueryParamsSchema = JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields), maxTake: 500 })
  .append<QueryParamsType>({
    userTypes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(ServiceRoleEnum)))
      .min(1)
      .description('Types of user to filter.'),
    organisationUnitId: Joi.string().guid().optional().description('Id of the organisation unit the user belongs to.'),
    onlyActive: Joi.boolean().optional().description('List only active users or all users.'),
    fields: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid('email'))
      .default([])
      .description('Additional fields to display in response.')
  })
  .required();
