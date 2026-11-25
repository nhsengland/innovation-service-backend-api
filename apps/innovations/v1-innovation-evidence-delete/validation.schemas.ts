import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  evidenceId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  evidenceId: JoiHelper.AppCustomJoi().string().guid().required()
});
