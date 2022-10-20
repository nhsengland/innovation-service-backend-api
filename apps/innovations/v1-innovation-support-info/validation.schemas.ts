import * as Joi from 'joi';


export type ParamsType = {
  innovationId: string;
  supportId: string;
}
export const ParamsSchema = Joi.object<ParamsType>({
  innovationId: Joi.string().guid().required(),
  supportId: Joi.string().guid().required()
}).required();
