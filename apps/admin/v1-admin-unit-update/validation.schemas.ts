import Joi from 'joi';
import {
    ORGANISATION_UNIT_NAME_LENGTH_LIMIT,
    ORGANISATION_UNIT_ACRONYM_LENGTH_LIMIT
} from '@admin/shared/constants'

export type ParamsType = {
  organisationId: string,
  organisationUnitId: string
};
export const ParamsSchema = Joi.object<ParamsType>({
  organisationId: Joi.string().guid().required(),
  organisationUnitId: Joi.string().guid().required(),
}).required();

export type BodyType = {
    name: string,
    acronym: string
}
export const BodySchema = Joi.object<BodyType>({
  name: Joi.string().max(ORGANISATION_UNIT_NAME_LENGTH_LIMIT).required(),
  acronym: Joi.string().max(ORGANISATION_UNIT_ACRONYM_LENGTH_LIMIT).required()
}).required();
