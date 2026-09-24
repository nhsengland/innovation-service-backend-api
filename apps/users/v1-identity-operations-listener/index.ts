import type { Context } from '@azure/functions';

import { JoiHelper } from '@users/shared/helpers';
import type { IdentityProviderService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';

import { container } from '../_config';

import type { IdentityOperationType } from './validation.schemas';
import { IdentityOperationSchema } from './validation.schemas';
import { normalizeNameUpdate } from './identity-name.helper';

class V1IdentityOperationsQueueListener {
  static async queueTrigger(
    context: Context,
    requestOperation: {
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
    }
  ): Promise<void> {
    const identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

    context.log.info('IDENTITY OPERATIONS LISTENER: ', JSON.stringify(requestOperation));

    try {
      const operation = JoiHelper.Validate<IdentityOperationType>(IdentityOperationSchema, requestOperation);
      const body = operation.data.body;
      const hasNameChange =
        Object.prototype.hasOwnProperty.call(body, 'givenName') ||
        Object.prototype.hasOwnProperty.call(body, 'surname');
      const updateBody = hasNameChange
        ? normalizeNameUpdate(body, await identityProviderService.getUserInfo(operation.data.identityId, true))
        : body;

      await identityProviderService.updateUser(operation.data.identityId, updateBody);

      context.res = { done: true };
      return;
    } catch (error) {
      context.log.error('ERROR: Unexpected error parsing identity operation: ', JSON.stringify(error));
      throw error;
    }
  }
}

export default V1IdentityOperationsQueueListener.queueTrigger;
