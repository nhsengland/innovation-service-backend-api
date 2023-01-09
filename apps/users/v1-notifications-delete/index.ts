import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { NotificationsServiceSymbol, NotificationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { PathParamsSchema, PathParamType } from './validation.schemas';


class V1UserNotificationsDelete {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const notificationsService = container.get<NotificationsServiceType>(NotificationsServiceSymbol);

    try {
      const authInstance = await authService.validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();
      const userInfo = authInstance.getUserInfo();

      const queryParams = JoiHelper.Validate<PathParamType>(PathParamsSchema, request.params);

      await notificationsService.deleteUserNotification(userInfo.id, queryParams.notificationId);
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
    parameters: SwaggerHelper.paramJ2S({path: PathParamsSchema}),
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
      },
    },
  },
});
