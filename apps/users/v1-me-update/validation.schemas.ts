import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@users/shared/constants';
import { PhoneUserPreferenceEnum } from '@users/shared/enums';

export type DefaultUserBodyType = {
  displayName: string
}

export const DefaultUserBodySchema = Joi.object<DefaultUserBodyType>({
  displayName: Joi.string().required()
}).required();


export type InnovatorBodyType = {
  displayName: string,
  contactByEmail: boolean,
  contactByPhone: boolean,
  contactDetails: string | null,
  contactByPhoneTimeframe: PhoneUserPreferenceEnum | null,
  mobilePhone?: null | string,
  organisation: {
    id: string,
    isShadow: boolean,
    name?: null | string,
    size?: null | string
  };
}

export const InnovatorBodySchema = Joi.object<InnovatorBodyType>({
  displayName: Joi.string().required(),
  mobilePhone: Joi.string().optional().allow(null),
  contactByEmail: Joi.boolean().optional(),
  contactByPhone: Joi.boolean().optional(),
  contactByPhoneTimeframe: Joi.valid(...Object.values(PhoneUserPreferenceEnum)).optional().allow(null),
  contactDetails: Joi.string().allow(null),
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: Joi.string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(), otherwise: Joi.string().optional().allow(null) }),
    size: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().allow(null) })
  }).required()
}).required();
