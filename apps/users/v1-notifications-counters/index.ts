import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
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
      const authInstance = await authService.validate(context).verify();
      const domainContext = authInstance.getContext();

      const total = await notificationsService.getUserActiveNotificationsCounter(domainContext.currentRole.id);
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
    description: 'Returns the notifications counters',
    operationId: 'v1-notifications-counters',
    tags: ['[v1] Notifications'],
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                total: {
                  type: 'number',
                  description: 'The total of active notifications',
                },
              },
            },
          }
        }
      },
    },
  },
});
