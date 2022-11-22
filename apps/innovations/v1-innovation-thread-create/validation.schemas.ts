import Joi from 'joi';


export type BodyType = {
  subject: string;
  message: string;
}
export const BodySchema = Joi.object<BodyType>({
  subject: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
}).required();

export type ParamsType = {
  innovationId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required()
});
