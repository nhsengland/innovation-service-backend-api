import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { NotifyMeService } from '../_services/notify-me.service';
import SYMBOLS from '../_services/symbols';
import type { SubscriptionResponseDTO } from '../_types/notify-me.types';
import { ParamSchema, ParamType } from './validation.schemas';

class V1NotifyMeSubscriptionGet {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    try {
      const params = JoiHelper.Validate<ParamType>(ParamSchema, request.params);

      const auth = await authorizationService.validate(context).checkAccessorType().verify();

      const res = await notifyMeService.getSubscription(auth.getContext(), params.subscriptionId);

      context.res = ResponseHelper.Ok<SubscriptionResponseDTO>(res);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1NotifyMeSubscriptionGet.httpTrigger as AzureFunction, '/v1/notify-me/{subscriptionId}', {
  get: {
    description: 'Notify me subscription get',
    operationId: 'v1-notify-me-subscription-get',
    tags: ['[v1] Notify Me'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamSchema }),
    responses: {
      200: { description: 'The subscription' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' }
    }
  }
});
