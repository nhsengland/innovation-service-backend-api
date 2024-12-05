import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { NotificationsService } from '../_services/notifications.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1UserNotificationsDismiss {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notificationsService = container.get<NotificationsService>(SYMBOLS.NotificationsService);

    try {
      const authInstance = await authService
        .validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();

      const domainContext = authInstance.getContext();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const affected = await notificationsService.dismissUserNotifications(domainContext, body);
      context.res = ResponseHelper.Ok<ResponseDTO>({ affected });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserNotificationsDismiss.httpTrigger as AzureFunction, '/v1/notifications/dismiss', {
  patch: {
    description: 'Returns the number of affected notifications',
    operationId: 'v1-notifications-dismiss',
    tags: ['[v1] Notifications'],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      })
    }
  }
});
