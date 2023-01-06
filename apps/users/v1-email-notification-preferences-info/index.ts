import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum } from '@users/shared/enums';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { NotificationsServiceSymbol, NotificationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1UserEmailNotificationsInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const notificationsService = container.get<NotificationsServiceType>(NotificationsServiceSymbol);

    try {
      const authInstance = await authService.validate(context.auth.user.identityId)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();
      const userInfo = authInstance.getUserInfo();

      const emailPreferences = await notificationsService.getUserEmailPreferences(userInfo.id);
      context.res = ResponseHelper.Ok<ResponseDTO>(emailPreferences.map(p => ({
        notificationType: p.notificationType,
        preference: p.preference,
      })));
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
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  notificationType: {
                    type: 'string',
                    description: 'The type of notification',
                    enum: Object.values(EmailNotificationTypeEnum),
                  },
                  preference: {
                    type: 'string',
                    description: 'The preference of the notification',
                    enum: Object.values(EmailNotificationPreferenceEnum)
                  }
                }
              }
            }
          }
        }
      },
    },
  },
});
