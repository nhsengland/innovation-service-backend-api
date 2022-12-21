import Joi from 'joi';

import { UserTypeEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';


export type QueryParamsType = {
  email: string;
  userTypes: UserTypeEnum[];
} | {
  userTypes: UserTypeEnum[];
  organisationUnitId?: string;
  fields: ('organisations' |'units')[];
}

export const QueryParamsSchema = Joi.alternatives().try(
  Joi.object<QueryParamsType>({
    email: Joi.string().email().lowercase().required().description('Email of a user.'),
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(UserTypeEnum))).required().description('Types of user to filter.')
  }),
  Joi.object<QueryParamsType>({
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(UserTypeEnum))).min(1).description('Types of user to filter.'),
    organisationUnitId: Joi.string().guid().optional().description('Id of the organisation unit the user belongs to.'),
    fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('organisations', 'units')).default([]).description('Additional fields to display in response.')
  })
);

