import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  sectionKey: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  sectionKey: Joi.string().required()
}).required();
