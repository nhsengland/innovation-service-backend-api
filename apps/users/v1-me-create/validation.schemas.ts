import Joi from 'joi';


export type BodyType = {
  token: string,
  surveyId?: null | string
}
export const BodySchema = Joi.object<BodyType>({
  token: Joi.string().required(),
  surveyId: Joi.string().optional().allow(null)
}).required();
