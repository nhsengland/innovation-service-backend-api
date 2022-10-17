import Joi from 'joi';
import { JoiHelper } from '@users/shared/helpers';


export type QueryParamsType = {
  fields?: ('organisationUnits')[]
}

export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('organisationUnits'))
});
