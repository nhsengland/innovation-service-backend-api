import Joi from 'joi';

import { InnovationSectionEnum } from '@innovations/shared/enums';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  section: InnovationSectionEnum,
  description: string
}
export const BodySchema = Joi.object<BodyType>({
  section: Joi.string().valid(...Object.values(InnovationSectionEnum)).required(),
  description: Joi.string().max(500).required()
}).required();
