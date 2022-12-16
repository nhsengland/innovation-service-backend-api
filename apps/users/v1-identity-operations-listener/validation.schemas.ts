import Joi from 'joi';

export type IdentityOperationType = {
  data: {
    identityId: string,
    body: {
      displayName?: string,
      mobilePhone?: string | null,
      accountEnabled?: boolean
    }
  }
}

export const IdentityOperationSchema = Joi.object<IdentityOperationType>({

  data: Joi.object<IdentityOperationType['data']>({
    identityId: Joi.string().guid().required(),
    body: Joi.object({
      displayName: Joi.string().optional(),
      mobilePhone: Joi.string().allow(null).optional(),
      accountEnabled: Joi.boolean().optional()
    }).required()
  }).required()

}).required();
