import * as Joi from 'joi';


export type BodyType = {
  name: string;
  description: string;
  countryName: string;
  postcode: null | string;
  organisationShares: string[];
  surveyId: null | string;
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(100).required().trim(),
  description: Joi.string().required(),
  countryName: Joi.string().required(),
  postcode: Joi.string().allow(null).optional(),
  organisationShares: Joi.array().items(Joi.string().guid()).min(1).required(),
}).required();

export type QueryParamsType = {
  isSurvey: boolean;
}

export const QueryParamsSchema =  Joi.object<QueryParamsType>({
  isSurvey: Joi.bool().optional(),
})