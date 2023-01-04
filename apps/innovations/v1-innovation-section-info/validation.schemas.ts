import Joi from 'joi';

import { InnovationSectionEnum } from '@innovations/shared/enums';
import { JoiHelper } from '@innovations/shared/helpers';


export type ParamsType = {
  innovationId: string;
  sectionKey: InnovationSectionEnum
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string().valid(...Object.values(InnovationSectionEnum)).required()
}).required();

export type QueryParamsType = {
  fields?: ('actions')[],
}
export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(Joi.string().valid('actions')),
});
