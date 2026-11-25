import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  requestId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().uuid().required(),
  requestId: JoiHelper.AppCustomJoi().string().uuid().required()
}).required();
