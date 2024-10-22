import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamType = {
  subscriptionId: string;
};

export const ParamSchema = Joi.object<ParamType>({
  subscriptionId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
