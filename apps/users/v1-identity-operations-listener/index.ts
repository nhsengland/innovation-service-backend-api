import type { Context } from '@azure/functions'
import { JoiHelper } from '@users/shared/helpers';
import { container } from '../_config';

import { IdentityOperationType, IdentityOperationSchema } from './validation.schemas'
import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@users/shared/services';

class V1IdentityOperationsQueueListener {

	static async queueTrigger(
		context: Context,
		requestOperation: {
			data: {
				identityId: string,
				body: {
					displayName?: string,
					mobilePhone?: string | null,
					accountEnabled?: boolean
				}
			}
		}
	): Promise<void> {

		// use identityOperations service (need to create)
		const identityProviderService = container.get<IdentityProviderServiceType>(IdentityProviderServiceSymbol);

		context.log.info('IDENTITY OPERATIONS LISTENER: ', JSON.stringify(requestOperation));

		try {

			const operation = JoiHelper.Validate<IdentityOperationType>(IdentityOperationSchema, requestOperation);

			await identityProviderService.updateUser(
				operation.data.identityId,
				operation.data.body
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

