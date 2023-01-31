import Joi from 'joi';

export type ParamsType = {
  userId: string
}
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the admin user.')
}).required()
