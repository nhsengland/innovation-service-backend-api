import Joi from 'joi';


export type BodyType = {
  name: string,
  description: string,
  countryName: string,
  postcode: null | string,
  organisationShares: string[]
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(100).required().trim(),
  description: Joi.string().required(),
  countryName: Joi.string().required(),
  postcode: Joi.string().allow(null).optional(),
  organisationShares: Joi.array().items(Joi.string().guid()).min(1).required()
}).required();

export type QueryParamsType = {
  useSurvey?: boolean
}
export const QueryParamsSchema = Joi.object<QueryParamsType>({
  useSurvey: Joi.bool().optional()
});
