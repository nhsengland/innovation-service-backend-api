import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { NotificationContextTypeEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationNotificationsDismiss {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();

      await innovationsService.dismissNotifications(requestUser, params.innovationId, body);
      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}


export default openApi(V1InnovationNotificationsDismiss.httpTrigger as AzureFunction, '/v1/{innovationId}/notifications/dismiss', {
  patch: {
    operationId: 'v1-innovation-notifications-dismiss',
    description: 'Dismisses innovation notifications.',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'Innovation ID',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
    ],
    requestBody: {
      description: 'Dismiss innovation notifications request body.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              notificationIds: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid'
                }
              },
              notificationContext: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid'
                  },
                  type: {
                    type: 'string',
                    enum: [Object.values(NotificationContextTypeEnum)]
                  }
                }                      
              }
            }
          }
        }
      }
    },
    responses: {
      204: { description: 'Success'},
      400: { description: 'Invalid payload' },
    },
  },
});
