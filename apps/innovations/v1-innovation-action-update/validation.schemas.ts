import { InnovationActionStatusEnum } from '@innovations/shared/enums';
import * as Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  actionId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  actionId: Joi.string().guid().required(),
}).required();

export type BodyType = {
  status: string;
  message: string;
}
export const BodySchema = Joi.object<BodyType>({
  status: Joi.string().valid(...Object.values(InnovationActionStatusEnum)).required(),
  message: Joi.string().max(500).allow(null).allow('').required(),
}).required();
