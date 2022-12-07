import Joi from 'joi';

export type ParamsType = {
  organisationId: string,
  organisationUnitId: string
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required(),
  organisationUnitId: Joi.string().guid().required(),
}).required();

export type BodyType = {
    userIds: string[],
}
export const BodySchema = Joi.object<BodyType>({
  userIds: Joi.array().items(Joi.string()).required()
}).required();
