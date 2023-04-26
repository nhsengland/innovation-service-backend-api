import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
  messageId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required(),
  messageId: Joi.string().guid().required(),
});
