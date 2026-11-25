import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  section: CurrentCatalogTypes.InnovationSections;
  description: string;
};
export const BodySchema = Joi.object<BodyType>({
  section: JoiHelper.AppCustomJoi()
    .string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required()
    .description('The section key.'),
  description: JoiHelper.AppCustomJoi()
    .string()
    .max(TEXTAREA_LENGTH_LIMIT.s)
    .required()
    .description('The description of the task.')
}).required();
