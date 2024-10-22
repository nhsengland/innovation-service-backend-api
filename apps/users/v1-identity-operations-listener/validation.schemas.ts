import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type IdentityOperationType = {
  data: {
    identityId: string;
    body: {
      displayName?: string;
      mobilePhone?: string | null;
      accountEnabled?: boolean;
    };
  };
};

export const IdentityOperationSchema = Joi.object<IdentityOperationType>({
  data: Joi.object<IdentityOperationType['data']>({
    identityId: JoiHelper.AppCustomJoi().string().guid().required(),
    body: Joi.object({
      displayName: JoiHelper.AppCustomJoi().string().optional(),
      mobilePhone: JoiHelper.AppCustomJoi().string().allow(null).optional(),
      accountEnabled: Joi.boolean().optional()
    }).required()
  }).required()
}).required();
