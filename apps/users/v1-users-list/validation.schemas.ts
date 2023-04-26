import Joi from 'joi';

import { ServiceRoleEnum } from '@users/shared/enums';
import { JoiHelper, PaginationQueryParamsType } from '@users/shared/helpers';

enum orderFields {
  createdAt = 'createdAt',
}

// TODO: CHANGE FRONTEND CALL
export type QueryParamsType =
  | {
      email: string;
      userTypes: ServiceRoleEnum[];
    }
  | (PaginationQueryParamsType<orderFields> & {
      userTypes: ServiceRoleEnum[];
      organisationUnitId?: string;
      onlyActive?: boolean;
      fields: 'email'[];
    });

export const QueryParamsSchema = Joi.alternatives().try(
  Joi.object<QueryParamsType>({
    email: JoiHelper.AppCustomJoi()
      .decodeURIString()
      .email()
      .lowercase()
      .required()
      .description('Email of a user.'),
    userTypes: JoiHelper.AppCustomJoi()
      .stringArray()
      .items(Joi.string().valid(...Object.values(ServiceRoleEnum)))
      .required()
      .description('Types of user to filter.'),
  }),
  JoiHelper.PaginationJoiSchema({ orderKeys: Object.keys(orderFields) })
    .append<QueryParamsType>({
      userTypes: JoiHelper.AppCustomJoi()
        .stringArray()
        .items(Joi.string().valid(...Object.values(ServiceRoleEnum)))
        .min(1)
        .description('Types of user to filter.'),
      organisationUnitId: Joi.string()
        .guid()
        .optional()
        .description('Id of the organisation unit the user belongs to.'),
      onlyActive: Joi.boolean().optional().description('List only active users or all users.'),
      fields: JoiHelper.AppCustomJoi()
        .stringArray()
        .items(Joi.string().valid('email'))
        .default([])
        .description('Additional fields to display in response.'),
    })
    .required()
);
