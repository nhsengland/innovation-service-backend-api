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
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1UserNotifications {
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

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const notifications = await notificationsService.getUserNotifications(domainContext, filters, {
        skip,
        take,
        order
      });
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
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      })
    }
  }
});
