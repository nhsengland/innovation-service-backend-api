import { ServiceRoleEnum, StrategicRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type ResponseDTO = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  jobTitle?: string | null;
  roles: {
    id: string;
    role: ServiceRoleEnum;
    isActive: boolean;
    organisation?: { id: string; name: string; acronym: string | null };
    organisationUnit?: { id: string; name: string; acronym: string };
    displayTeam?: string;
  }[];
  strategicRoles: { id: string; role: StrategicRoleEnum }[];
};

export const ResponseBodySchema = Joi.object<ResponseDTO>({
  id: Joi.string().uuid().required(),
  email: Joi.string().required(),
  name: Joi.string().required(),
  phone: Joi.string().optional(),
  isActive: Joi.boolean().required(),
  jobTitle: Joi.string().allow(null).optional(),
  roles: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      role: Joi.string().valid(...Object.values(ServiceRoleEnum)),
      isActive: Joi.boolean().required(),
      organisation: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        acronym: Joi.string().allow(null).required()
      }).optional(),
      organisationUnit: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        acronym: Joi.string().required()
      }).optional(),
      displayTeam: Joi.string().optional()
    })
  ),
  strategicRoles: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      role: Joi.string().valid(...Object.values(StrategicRoleEnum)).required()
    })
  ).required()
});
