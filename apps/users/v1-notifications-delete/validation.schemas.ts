import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  notificationId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  notificationId: JoiHelper.AppCustomJoi().string().uuid().required().description('The notification ID')
}).required();
