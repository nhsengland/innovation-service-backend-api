import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { InnovationStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum } from '@users/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { NotificationsServiceSymbol, NotificationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1UserNotifications {

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
      const domainContext = authInstance.getContext(); 

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const notifications = await notificationsService.getUserNotifications(domainContext, filters, { skip, take, order });
      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: notifications.total,
        data: notifications.data.map(notification => ({
          id: notification.id,
          innovation: {
            id: notification.innovation.id,
            name: notification.innovation.name,
            status: notification.innovation.status
          },
          contextType: notification.contextType,
          contextDetail: notification.contextDetail,
          contextId: notification.contextId,
          createdAt: notification.createdAt,
          readAt: notification.readAt,
          params: notification.params
        }))
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1UserNotifications.httpTrigger as AzureFunction, '/v1/notifications', {
  get: {
    description: 'Returns the user notifications',
    operationId: 'v1-notifications-list',
    tags: ['[v1] Notifications'],
    parameters: SwaggerHelper.paramJ2S({query: QueryParamsSchema}),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  description: 'The total number of notifications',
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The notification ID',
                      },
                      innovation: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'The innovation ID',
                          },
                          name: {
                            type: 'string',
                            description: 'The innovation name',
                          },
                          status: {
                            type: 'string',
                            enum: Object.keys(InnovationStatusEnum),
                            description: 'The innovation status',
                          },
                        },
                      },
                      contextType: {
                        type: 'string',
                        enum: Object.keys(NotificationContextTypeEnum),
                        description: 'The notification context type',
                      },
                      contextDetail: {
                        type: 'string',
                        enum: Object.keys(NotificationContextDetailEnum),
                        description: 'The notification context detail',
                      },
                      contextId: {
                        type: 'string',
                        description: 'The notification context ID',
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'The notification creation date',
                      },
                      readAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'The notification read date',
                      },
                      params: {
                        type: 'object',
                        description: 'The notification params',
                      },
                    }
                  }
                }
              },
            },
          }
        }
      },
    },
  },
});
