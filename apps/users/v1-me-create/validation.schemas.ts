import Joi from 'joi';


export type BodyType = {
  token: string
  surveyId: string,
}

export const BodySchema = Joi.object<BodyType>({
  surveyId: Joi.string().required(),
  token: Joi.string().required()
}).required();
