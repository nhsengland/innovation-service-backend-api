import type { IdentityOperationsTypeEnum } from '@users/shared/enums';
import type { Context } from '@azure/functions'
import { JoiHelper } from '@users/shared/helpers';
import { container } from '../_config';

import { IdentityOperationType, IdentityOperationSchema } from './validation.schemas'
import { IdentityOperationsServiceType, IdentityOperationsServiceSymbol } from '../_services/interfaces';

class V1IdentityOperationsQueueListener {

    static async queueTrigger (
        context: Context,
        requestOperation: {
            data: {
                type: IdentityOperationsTypeEnum,
                identityId : string
            }
        }
    ) : Promise<void> {

        // use identityOperations service (need to create)
        const identityOperationsService = container.get<IdentityOperationsServiceType>(IdentityOperationsServiceSymbol);

        context.log.info('IDENTITY OPERATIONS LISTENER: ', JSON.stringify(requestOperation));

        try {

            const operation = JoiHelper.Validate<IdentityOperationType>(IdentityOperationSchema, requestOperation);
      
            await identityOperationsService.updateUser(
                operation.data.type,
                operation.data.identityId,
            );
      
            context.res = { done: true };
            return;
      
          } catch (error) {
            context.log.error('ERROR: Unexpected error parsing idendity operation: ', JSON.stringify(error));
            throw error;
          }

    }
}


export default V1IdentityOperationsQueueListener.queueTrigger;

