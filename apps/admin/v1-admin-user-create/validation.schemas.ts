import { JoiHelper } from '@admin/shared/helpers';
import { CreateRolesSchema, type CreateRolesType } from '@admin/shared/types';
import Joi from 'joi';
import { StrategicRoleEnum } from '@admin/shared/enums';

export type BodyType = {
  givenName: string;
  surname: string;
  email: string;
  strategicRoles?: StrategicRoleEnum[];
} & CreateRolesType;

export const BodySchema = Joi.object<BodyType>({
  givenName: JoiHelper.AppCustomJoi().string().trim().min(1).max(64).required().description('Given name of the user.'),
  surname: JoiHelper.AppCustomJoi().string().trim().min(1).max(64).required().description('Surname of the user.'),
  email: JoiHelper.AppCustomJoi().string().max(100).email().required().description('Email of the user.'),
  strategicRoles: Joi.array()
    .items(Joi.string().valid(...Object.values(StrategicRoleEnum)))
    .optional()
    .description('Strategic roles to be assigned to the user.')
}).concat(CreateRolesSchema as any);
