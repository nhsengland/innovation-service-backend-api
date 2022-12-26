import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';
import { AccessorOrganisationRoleEnum, UserTypeEnum } from '@admin/shared/enums';
import Joi from 'joi';

export type BodyType = {
  name: string,
  email: string,
  type: UserTypeEnum,
  organisation?: {
    acronym: string,
    unitAcronym: string
    role: AccessorOrganisationRoleEnum
  }
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().required().description('Name of the user.'),
  email: Joi.string().email().required().description('Email of the user.'),
  type: Joi.string().valid(...Object.values(UserTypeEnum).filter(t => t !== UserTypeEnum.INNOVATOR)).required().description('Type of the user.'),
  organisation: Joi.object({
    acronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.acronym).required().description('Acronym of the organisation.'),
    unitAcronym: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.unit_acronym).required().description('Acronym of the organisation unit.'),
    role: Joi.string().valid(...Object.values(AccessorOrganisationRoleEnum)).required().description('Role of the user within the organisation.')
  }).optional().description('Organisation and Unit to which the user belongs.')
}).required()
