import Joi from 'joi';


export type AccessorBodyType = {
  displayName: string
}

export const AccessorBodySchema = Joi.object<AccessorBodyType>({
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
  mobilePhone: Joi.string().optional().valid(null),
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: Joi.string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().valid(null) }),
    size: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().valid(null) })
  }).required()
}).required();
