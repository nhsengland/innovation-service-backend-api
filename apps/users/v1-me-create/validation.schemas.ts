import Joi from 'joi';


export type BodyType = {
  identityId?: string,
  token?: string,
  surveyId?: null | string
}
export const BodySchema = Joi.object<BodyType>({
  identityId: Joi.string().guid().optional(),
  token: Joi.string().optional(),
  surveyId: Joi.string().optional().allow(null)
}).or('identityId', 'token').required();
