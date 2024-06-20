import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { NotifyMeService } from '../_services/notify-me.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { QuerySchema, type QueryType } from './validation.schemas';

class V1NotifyMeSubscriptionList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    try {
      const queryParams = JoiHelper.Validate<QueryType>(QuerySchema, request.query);
      const auth = await authorizationService.validate(context).checkAccessorType().verify();

      const subscriptions = await notifyMeService.getNotifyMeSubscriptions(auth.getContext(), queryParams.withDetails);

      context.res = ResponseHelper.Ok<ResponseDTO>(subscriptions);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1NotifyMeSubscriptionList.httpTrigger as AzureFunction, '/v1/notify-me', {
  get: {
    description: 'Notify me subscriptions list',
    operationId: 'v1-notify-me-subscription-list',
    tags: ['[v1] Notify Me'],
    responses: {
      200: { description: 'List of user custom notifications' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' }
    }
  }
});
