import Joi from 'joi';

import { UserTypeEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';


export type QueryParamsType = {
  email?: string;
  organisationUnitId?: string;
  userTypes?: UserTypeEnum[];
}

export const QueryParamsSchema = Joi.alternatives().try(
  Joi.object<QueryParamsType>({
    email: Joi.string().email().lowercase().required(),
    userTypes: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid(...Object.values(UserTypeEnum))).required()
  }),
  Joi.object<QueryParamsType>({
    organisationUnitId: Joi.string().guid().required()
  })
);
