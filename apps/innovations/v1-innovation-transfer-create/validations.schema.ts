import Joi from 'joi';


export type BodyType = {
  innovationId: string;
  email: string;
}
export const BodySchema = Joi.object<BodyType>({
  email: Joi.string().email().required(),
  innovationId: Joi.string().guid().required(),
}).required();
