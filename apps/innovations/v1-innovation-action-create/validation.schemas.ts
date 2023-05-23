import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  section: CurrentCatalogTypes.InnovationSections;
  description: string;
};
export const BodySchema = Joi.object<BodyType>({
  section: Joi.string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required()
    .description('The section key.'),
  description: Joi.string().max(500).required().description('The description of the action.')
}).required();
