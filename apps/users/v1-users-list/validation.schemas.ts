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
    email: Joi.string().email().lowercase().required(),
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(UserTypeEnum))).required()
  }),
  Joi.object<QueryParamsType>({
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(UserTypeEnum))).min(1),
    organisationUnitId: Joi.string().guid().optional(),
    fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('organisations', 'units')).default([])
  })
);