import Joi from 'joi';

import { InnovationSectionEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
  sectionKey: InnovationSectionEnum
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string().valid(...Object.values(InnovationSectionEnum)).required()
}).required();
