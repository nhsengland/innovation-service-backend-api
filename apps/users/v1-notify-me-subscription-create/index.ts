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
import { BodySchema, BodyType } from './validation.schemas';

class V1NotifyMeSubscriptionCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(body.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovation()
        .verify();

      await notifyMeService.createSubscription(auth.getContext(), body.innovationId, body.config);

      context.res = ResponseHelper.Created();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1NotifyMeSubscriptionCreate.httpTrigger as AzureFunction, '/v1/me/notify-me', {
  post: {
    description: 'Notify me subscription create',
    operationId: 'v1-notify-me-subscription-create',
    tags: ['[v1] Notify Me'],
    parameters: [],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      204: { description: 'Subscription created' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' }
    }
  }
});
