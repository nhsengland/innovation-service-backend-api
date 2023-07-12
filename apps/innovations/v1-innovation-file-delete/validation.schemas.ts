import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  fileId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  fileId: Joi.string().guid().required()
});
