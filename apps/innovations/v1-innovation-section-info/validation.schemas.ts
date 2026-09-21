import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

export type ParamsType = {
  innovationId: string;
  sectionKey: CurrentCatalogTypes.InnovationSections;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  sectionKey: JoiHelper.AppCustomJoi().string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required()
}).required();

export type QueryParamsType = {
  fields?: 'tasks'[];
};
export const QueryParamsSchema = Joi.object({
  fields: JoiHelper.AppCustomJoi().stringArray().items(JoiHelper.AppCustomJoi().string().valid('tasks'))
});
