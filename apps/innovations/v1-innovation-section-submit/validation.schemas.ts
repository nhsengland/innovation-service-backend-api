import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  sectionKey: CurrentCatalogTypes.InnovationSections;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required(),
}).required();
