import type { Context } from '@azure/functions';

import { JoiHelper } from '@users/shared/helpers';
import type { IdentityProviderService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';

import { container } from '../_config';

import { IdentityOperationSchema, IdentityOperationType } from './validation.schemas';

class V1IdentityOperationsQueueListener {
  static async queueTrigger(
    context: Context,
    requestOperation: {
      data: {
        identityId: string;
        body: {
          displayName?: string;
          mobilePhone?: string | null;
          accountEnabled?: boolean;
        };
      };
    }
  ): Promise<void> {
    const identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

    context.log.info('IDENTITY OPERATIONS LISTENER: ', JSON.stringify(requestOperation));

    try {
      const operation = JoiHelper.Validate<IdentityOperationType>(IdentityOperationSchema, requestOperation);

      await identityProviderService.updateUser(operation.data.identityId, operation.data.body);

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing idendity operation: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1IdentityOperationsQueueListener.queueTrigger;
