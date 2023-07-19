import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  progressId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  progressId: Joi.string().guid().required()
});
