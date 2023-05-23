import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  evidenceOffset: number;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  evidenceOffset: Joi.number().integer().min(0).required()
}).required();
