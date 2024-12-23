import { JoiHelper } from '@admin/shared/helpers';
import { CreateRolesSchema, type CreateRolesType } from '@admin/shared/types';
import Joi from 'joi';

export type BodyType = {
  name: string;
  email: string;
} & CreateRolesType;

export const BodySchema = Joi.object<BodyType>({
  name: JoiHelper.AppCustomJoi().string().max(100).required().description('Name of the user.'),
  email: JoiHelper.AppCustomJoi().string().max(100).email().required().description('Email of the user.')
}).concat(CreateRolesSchema as any);
