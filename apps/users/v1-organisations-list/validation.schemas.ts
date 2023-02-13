import Joi from 'joi';

import { ServiceRoleEnum } from '@users/shared/enums';
import { JoiHelper } from '@users/shared/helpers';


export type QueryParamsType = {
  fields?: ('organisationUnits')[],
  withInactive?: boolean
}

export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('organisationUnits')),
  withInactive:
    Joi.when('$userType', {
      is: ServiceRoleEnum.ADMIN,
      then: Joi.boolean().optional(),
      otherwise: Joi.forbidden()
    })
});
