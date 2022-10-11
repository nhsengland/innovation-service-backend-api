import * as Joi from 'joi';


export type AccessorBodyType = {
  displayName: string;
}

export const AccessorBodySchema = Joi.object<AccessorBodyType>({
  displayName: Joi.string().required()
}).required();


export type InnovatorBodyType = {
  displayName: string;
  mobilePhone?: string;
  organisation: {
    id: string;
    isShadow: boolean;
    name?: string;
    size?: string;
  };
}

export const InnovatorBodySchema = Joi.object<InnovatorBodyType>({
  displayName: Joi.string().required(),
  mobilePhone: Joi.string(),
  organisation: Joi.object<InnovatorBodyType['organisation']>({
    id: Joi.string().guid().required(),
    isShadow: Joi.boolean().strict().required(),
    name: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().valid(null) }),
    size: Joi.alternatives().conditional('isShadow', { is: false, then: Joi.string().required(), otherwise: Joi.string().optional().valid(null) })
  }).required()
}).required();
