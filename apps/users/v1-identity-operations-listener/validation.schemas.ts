import { JoiHelper } from '@users/shared/helpers';
import Joi from 'joi';

export type IdentityOperationType = {
  data: {
    identityId: string;
    body: {
      givenName?: string;
      surname?: string;
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
      givenName: JoiHelper.AppCustomJoi().string().trim().min(1).max(64).optional(),
      surname: JoiHelper.AppCustomJoi().string().trim().min(1).max(64).optional(),
      displayName: JoiHelper.AppCustomJoi().string().optional(),
      mobilePhone: JoiHelper.AppCustomJoi().string().allow(null).optional(),
      accountEnabled: Joi.boolean().optional()
    }).required()
  }).required()
}).required();
