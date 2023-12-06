import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required()
});

export type BodyType = {
  followerUserRoleIds: string[];
};
export const BodySchema = Joi.object<BodyType>({
  followerUserRoleIds: Joi.array().items(Joi.string().guid().required()).required()
});
