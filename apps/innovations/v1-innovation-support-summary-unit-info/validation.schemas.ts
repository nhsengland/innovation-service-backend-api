import Joi from 'joi';

export type ParamsType = {
  innovationId: string;
  unitId: string;
};
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  unitId: Joi.string().guid().required()
});
