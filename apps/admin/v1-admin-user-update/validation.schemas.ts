import Joi from 'joi';
import type { UsersService } from '../_services/users.service';

export type ParamsType = {
  userId: string,
};
export const ParamsSchema = Joi.object<ParamsType>({
  userId: Joi.string().guid().required().description('Id of the user to lock.')
}).required();

export type BodyType = Parameters<UsersService['updateUser']>[2]

export const BodySchema = Joi.object<BodyType>({
  accountEnabled: Joi.boolean().description('Enable or disable the user.').allow(null)
}).required();