import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  threadId: string;
  roleId: string;
};

export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  threadId: Joi.string().guid().required(),
  roleId: Joi.string().guid().required()
});
