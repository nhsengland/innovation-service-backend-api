import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  userId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required()
});
