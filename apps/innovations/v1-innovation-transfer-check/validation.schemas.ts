import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  transferId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  transferId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
