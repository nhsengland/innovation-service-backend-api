import { JoiHelper } from '@admin/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  userId: string;
  roleId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: JoiHelper.AppCustomJoi().string().guid().required(),
  roleId: JoiHelper.AppCustomJoi().string().guid().required()
}).required();

export type BodyType = { enabled?: boolean };

export const BodySchema = Joi.object<BodyType>({
  enabled: Joi.boolean().optional()
});
