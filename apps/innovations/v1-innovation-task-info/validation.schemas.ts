import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  taskId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  taskId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
