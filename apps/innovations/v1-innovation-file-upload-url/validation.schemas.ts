import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = {
  filename: string;
};
export const BodySchema = Joi.object<BodyType>({
  filename: JoiHelper.AppCustomJoi().string().required()
}).required();
