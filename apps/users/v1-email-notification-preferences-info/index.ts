import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { NotificationsService } from '../_services/notifications.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';

class V1UserEmailNotificationsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {
    const authService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const notificationsService = container.get<NotificationsService>(SYMBOLS.NotificationsService);

    try {
      const auth = await authService
        .validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();

      const preferences = await notificationsService.getUserRoleEmailPreferences(auth.getContext());

      context.res = ResponseHelper.Ok<ResponseDTO>(preferences);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserEmailNotificationsInfo.httpTrigger as AzureFunction, '/v1/email-preferences', {
  get: {
    description: 'Returns the user email notifications preferences',
    operationId: 'v1-email-notification-preferences-info',
    tags: ['[v1] Email Preferences'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {}
            }
          }
        }
      }
    }
  }
});
