import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  userIdOrEmail: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userIdOrEmail: [
    Joi.string().guid().required(),
    JoiHelper.AppCustomJoi().decodeURIString().email().lowercase().required()
  ]
}).required();
