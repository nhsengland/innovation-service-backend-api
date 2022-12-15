import Joi from 'joi';

import { JoiHelper } from '@users/shared/helpers';
import { UserTypeEnum } from '@users/shared/enums';


export type QueryParamsType = {
  fields?: ('organisationUnits')[],
  withInactive?: boolean
}

export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('organisationUnits')),
  withInactive:
    Joi.when('$userType', {
      is: UserTypeEnum.ADMIN,
      then: Joi.boolean().optional(),
      otherwise: Joi.forbidden()
    })
});
