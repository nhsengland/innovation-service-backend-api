import Joi from 'joi';


export type BodyType = {
  message: string;
}
export const BodySchema = Joi.object<BodyType>({
  message: Joi.string().max(2000).required(),
}).required();

export type ParamsType = {
  innovationId: string;
  threadId: string;
  messageId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required(),
  messageId: Joi.string().guid().required(),
});
