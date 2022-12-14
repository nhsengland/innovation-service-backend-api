import Joi from 'joi';

import { IdentityOperationsTypeEnum } from '@users/shared/enums';


export type IdentityOperationType = {
  data: {
    type: IdentityOperationsTypeEnum,
    identityId: string
  }
}

export const IdentityOperationSchema = Joi.object<IdentityOperationType>({

  data: Joi.object<IdentityOperationType['data']>({

    type: Joi.string().valid(...Object.values(IdentityOperationsTypeEnum)).required(),

    identityId: Joi.string().guid().required()

  }).required()

}).required();
