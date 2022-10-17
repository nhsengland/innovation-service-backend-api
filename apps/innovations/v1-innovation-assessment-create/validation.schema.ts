import * as Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';


export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
}).required();

export type BodyType = {
  comment: string;
}
export const BodySchema = Joi.object<BodyType>({
  comment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.medium).required()
}).required();
