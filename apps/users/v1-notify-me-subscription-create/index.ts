import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import { BodySchema, BodyType } from './validation.schemas';
import SYMBOLS from '../_services/symbols';
import type { NotifyMeService } from '../_services/notify-me.service';

class V1NotifyMeSubscriptionCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notifyMeService = container.get<NotifyMeService>(SYMBOLS.NotifyMeService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      // TODO: - we should validate the body.config.preConditions that same way we do on notify-me-listener.

      const auth = await authorizationService
        .validate(context)
        .setInnovation(body.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      await notifyMeService.createSubscription(auth.getContext(), body.innovationId, body.config);

      context.res = ResponseHelper.NoContent();
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
