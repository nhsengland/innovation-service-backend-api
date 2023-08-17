import { CreateRolesSchema, type CreateRolesType } from '@admin/shared/types';
import Joi from 'joi';

export type BodyType = {
  name: string;
  email: string;
} & CreateRolesType;

export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required().description('Name of the user.'),
  email: Joi.string().email().required().description('Email of the user.')
}).concat(CreateRolesSchema as any);
