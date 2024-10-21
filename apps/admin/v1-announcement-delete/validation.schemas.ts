import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  announcementId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  announcementId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
