import Joi from 'joi';

import { InnovationSectionCatalogueEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
  sectionKey: InnovationSectionCatalogueEnum
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string().valid(...Object.values(InnovationSectionCatalogueEnum)).required()
}).required();
