import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  assessmentId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  assessmentId: Joi.string().guid().required(),
}).required();
