import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  collaboratorId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  collaboratorId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();
