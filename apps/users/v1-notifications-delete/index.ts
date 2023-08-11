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
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1UserNotificationsDelete {
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

      const queryParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await notificationsService.deleteUserNotification(domainContext.currentRole.id, queryParams.notificationId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: queryParams.notificationId
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserNotificationsDelete.httpTrigger as AzureFunction, '/v1/notifications/{notificationId}', {
  delete: {
    description: 'Returns the id of the deleted notification',
    operationId: 'v1-notifications-delete',
    tags: ['[v1] Notifications'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'The notification id' }
              }
            }
          }
        }
      }
    }
  }
});
