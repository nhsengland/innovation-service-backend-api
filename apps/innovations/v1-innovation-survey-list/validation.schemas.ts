import Joi from 'joi';

import { JoiHelper } from '@innovations/shared/helpers';

export type ParamsType = { innovationId: string };
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
