import { JoiHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  sectionKey: CurrentCatalogTypes.InnovationSections;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  sectionKey: JoiHelper.AppCustomJoi()
    .string()
    .valid(...CurrentCatalogTypes.InnovationSections)
    .required()
}).required();
