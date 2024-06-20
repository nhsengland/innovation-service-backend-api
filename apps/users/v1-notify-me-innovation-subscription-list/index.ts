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
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1NotifyMeSubscriptionList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovation()
        .verify();

      const subscriptions = await notifyMeService.getInnovationSubscriptions(auth.getContext(), params.innovationId);

      context.res = ResponseHelper.Ok<ResponseDTO>(subscriptions);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1NotifyMeSubscriptionList.httpTrigger as AzureFunction,
  '/v1/notify-me/innovation/{innovationId}',
  {
    get: {
      description: 'Notify me innovation subscriptions list',
      operationId: 'v1-notify-me-innovation-subscription-list',
      tags: ['[v1] Notify Me'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: { description: 'List of user innovation custom notifications' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        500: { description: 'Internal server error' }
      }
    }
  }
);
