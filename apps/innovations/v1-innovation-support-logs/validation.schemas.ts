import Joi from 'joi';
import type { InnovationSupportsLogType } from '../_types/innovation.types';

export type ParamsType = {
  innovationId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
}).required();

export type BodyType = InnovationSupportsLogType;
