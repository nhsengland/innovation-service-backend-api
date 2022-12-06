import Joi from 'joi';
import type { InnovationSupportLogEnum } from '../_enums/innovation.enums';

export type ParamsType = {
  innovationId: string;
  type?: InnovationSupportLogEnum;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  type: Joi.string().guid()
}).required();
