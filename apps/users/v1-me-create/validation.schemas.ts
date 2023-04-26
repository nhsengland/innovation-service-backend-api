import Joi from 'joi';


export type BodyType = {
  identityId?: string,
  token?: string,
}
export const BodySchema = Joi.object<BodyType>({
  identityId: Joi.string().guid().optional(),
  token: Joi.string().optional(),
}).or('identityId', 'token').required();
