import Joi from 'joi';

import { ORGANISATIONS_LENGTH_LIMITS } from '@admin/shared/constants';

export type DefaultUserBodyType = {
  displayName: string
}

export const DefaultUserBodySchema = Joi.object<DefaultUserBodyType>({
  displayName: Joi.string().required()
}).required();


export type InnovatorBodyType = {
  displayName: string,
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
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: Joi.string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().max(ORGANISATIONS_LENGTH_LIMITS.name).required(), otherwise: Joi.string().optional().allow(null) }),
    size: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().allow(null) })
  }).required()
}).required();
