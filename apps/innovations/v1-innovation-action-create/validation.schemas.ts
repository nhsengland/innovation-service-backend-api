import Joi from 'joi';

import { InnovationSectionCatalogueEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  description: string;
  sectionKey: InnovationSectionCatalogueEnum;
}
export const BodySchema = Joi.object<BodyType>({
  description: Joi.string().max(500).required(),
  sectionKey: Joi.string().valid(...Object.values(InnovationSectionCatalogueEnum)).required()
}).required();
