import Joi from 'joi';

import { InnovationSectionEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  description: string;
  sectionKey: InnovationSectionEnum;
}
export const BodySchema = Joi.object<BodyType>({
  description: Joi.string().max(500).required(),
  sectionKey: Joi.string().valid(...Object.values(InnovationSectionEnum)).required()
}).required();
