import Joi from 'joi';

import { ServiceRoleEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';

// TODO: CHANGE FRONTEND CALL 
export type QueryParamsType = {
  email: string;
  userTypes: ServiceRoleEnum[];
} | {
  userTypes: ServiceRoleEnum[];
  organisationUnitId?: string;
  onlyActive?: boolean;
  fields: ('email' | 'organisations' | 'units')[];
}

export const QueryParamsSchema = Joi.alternatives().try(
  Joi.object<QueryParamsType>({
    email: JoiHelper.AppCustomJoi().decodeURIString().email().lowercase().required().description('Email of a user.'),
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(ServiceRoleEnum))).required().description('Types of user to filter.')
  }),
  Joi.object<QueryParamsType>({
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(ServiceRoleEnum))).min(1).description('Types of user to filter.'),
    organisationUnitId: Joi.string().guid().optional().description('Id of the organisation unit the user belongs to.'),
    onlyActive: Joi.boolean().optional().description('List only active users or all users.'),
    fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('email', 'organisations', 'units')).default([]).description('Additional fields to display in response.')
  })
);

