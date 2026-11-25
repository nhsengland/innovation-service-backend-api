import { JoiHelper } from '@innovations/shared/helpers';
import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
  threadId: JoiHelper.AppCustomJoi().string().guid().required()
});

export type BodyType = {
  followerUserRoleIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  followerUserRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid().required()).required()
});
