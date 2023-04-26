import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';
import { AccessorOrganisationRoleEnum, ServiceRoleEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type BodyType = {
  name: string;
  email: string;
  type: ServiceRoleEnum;
  organisationAcronym?: string | null;
  organisationUnitAcronym?: string | null;
  role?: AccessorOrganisationRoleEnum | null;
};
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required().description('Name of the user.'),
  email: Joi.string().email().required().description('Email of the user.'),
  type: Joi.string()
    .valid(...Object.values(ServiceRoleEnum).filter((t) => t !== ServiceRoleEnum.INNOVATOR))
    .required()
    .description('Type of the user.'),
  organisationAcronym: Joi.string()
    .max(ORGANISATIONS_LENGTH_LIMITS.acronym)
    .optional()
    .allow(null)
    .description('Acronym of the organisation.'),
  organisationUnitAcronym: Joi.string()
    .max(ORGANISATIONS_LENGTH_LIMITS.unit_acronym)
    .optional()
    .allow(null)
    .description('Acronym of the organisation unit.'),
  role: Joi.string()
    .valid(...Object.values(AccessorOrganisationRoleEnum))
    .optional()
    .allow(null)
    .description('Role of the user within the organisation.'),
}).required();
