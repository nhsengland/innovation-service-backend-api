import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@users/shared/constants';

export type DefaultUserBodyType = {
  displayName: string
}

export const DefaultUserBodySchema = Joi.object<DefaultUserBodyType>({
  displayName: Joi.string().required()
}).required();


export type InnovatorBodyType = {
  displayName: string,
  contactPreferences?: string | null,
  phoneTimePreferences?: string | null,
  mobilePhone?: null | string,
  contactDetails?: string | null,
  organisation: {
    id: string,
    isShadow: boolean,
    name?: null | string,
    size?: null | string
  };
}

export const InnovatorBodySchema = Joi.object<InnovatorBodyType>({
  displayName: Joi.string().required(),
  contactPreferences: Joi.string().optional().allow(null),
  phoneTimePreferences: Joi.string().optional().allow(null),
  mobilePhone: Joi.string().optional().allow(null),
  contactDetails: Joi.string().optional().allow(null),
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: Joi.string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(), otherwise: Joi.string().optional().allow(null) }),
    size: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().allow(null) })
  }).required()
}).required();
