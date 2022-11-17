import { mapOpenApi as openApi } from '@aaronpowell/azure-functions-nodejs-openapi/build/openAPIv2';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { NotificationsServiceSymbol, NotificationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1UserNotificationsCounter {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const notificationsService = container.get<NotificationsServiceType>(NotificationsServiceSymbol);

    try {
      const authInstance = await authService.validate(context.auth.user.identityId).verify();
      const userInfo = authInstance.getUserInfo();

      const total = await notificationsService.getUserActiveNotificationsCounter(userInfo.id);
      context.res = ResponseHelper.Ok<ResponseDTO>({total: total});
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1UserNotificationsCounter.httpTrigger as AzureFunction, '/v1/notifications/counters', {
  get: {
    description: 'Get the user notifications counters',
    operationId: 'v1-notifications-counters',
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        schema: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'The total of active notifications',
            },
          },
        },
      },
    },
  },
});
