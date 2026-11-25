import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the innovation.'),
  assessmentId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the assessment.')
}).required();

export type BodyType = {
  assessorId: string;
};
export const BodySchema = Joi.object<BodyType>({
  assessorId: JoiHelper.AppCustomJoi().string().guid().required().description('Id of the new assessor to assign.')
}).required();
