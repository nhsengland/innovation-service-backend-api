import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';

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
  description: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required().description('The description of the task.')
}).required();
