import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  evidenceId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  evidenceId: Joi.string().guid().required()
}).required();
