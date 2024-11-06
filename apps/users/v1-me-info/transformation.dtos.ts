import { PhoneUserPreferenceEnum } from '@users/shared/enums';
import type { RoleType } from '@users/shared/types';
import Joi from 'joi';
import { ServiceRoleEnum } from 'libs/shared/enums/user.enums';

export type ResponseDTO = {
  id: string;
  email: string;
  displayName: string;
  roles: RoleType[];
  contactByEmail: boolean;
  contactByPhone: boolean;
  contactByPhoneTimeframe: null | PhoneUserPreferenceEnum;
  contactDetails: null | string;
  phone: null | string;
  termsOfUseAccepted: boolean;
  hasInnovationTransfers: boolean;
  hasInnovationCollaborations: boolean;
  hasLoginAnnouncements: { [k: string]: boolean };
  passwordResetAt: null | Date;
  firstTimeSignInAt: null | Date;
  organisations: {
    id: string;
    acronym: string | null;
    name: string;
    isShadow: boolean;
    size: null | string;
    description: null | string;
    registrationNumber: null | string;
    organisationUnits: { id: string; name: string; acronym: string }[];
  }[];
};

const organisationsSchema = Joi.array().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    acronym: Joi.string().allow(null).required(),
    name: Joi.string().required(),
    isShadow: Joi.boolean().required(),
    size: Joi.string().allow(null).required(),
    description: Joi.string().allow(null).required(),
    registrationNumber: Joi.string().allow(null).required()
  })
);

const rolesTypeSchema = {
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
  }).optional()
};

export const ResponseBodySchema = Joi.array<ResponseDTO>().items(
  Joi.object({
    id: Joi.string().uuid().required(),
    email: Joi.string().required(),
    displayName: Joi.string().required(),
    roles: rolesTypeSchema,
    contactByEmail: Joi.boolean().required(),
    contactByPhone: Joi.boolean().required(),
    contactByPhoneTimeframe: Joi.string()
      .valid(...Object.values(PhoneUserPreferenceEnum))
      .allow(null),
    contactDetails: Joi.string().allow(null).required(),
    phone: Joi.string().allow(null).required(),
    termsOfUseAccepted: Joi.boolean().required(),
    hasInnovationTransfers: Joi.boolean().required(),
    hasInnovationCollaborations: Joi.boolean().required(),
    hasLoginAnnouncements: Joi.object().pattern(Joi.string(), Joi.boolean()),
    passwordResetAt: Joi.date().allow(null).required(),
    firstTimeSignInAt: Joi.date().allow(null).required(),
    organisations: organisationsSchema
  })
);
