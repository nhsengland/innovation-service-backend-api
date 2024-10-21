import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  subscriptionId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  subscriptionId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
