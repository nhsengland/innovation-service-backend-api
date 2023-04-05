import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';


export type ParamsType = {
  innovationId: string;
  sectionKey: CurrentCatalogTypes.InnovationSections
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string().valid(...CurrentCatalogTypes.InnovationSections).required()
}).required();

export type QueryParamsType = {
  fields?: ('actions')[],
}
export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('actions')),
});
