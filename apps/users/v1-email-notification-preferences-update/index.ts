import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { NotificationsService } from '../_services/notifications.service';
import SYMBOLS from '../_services/symbols';
import { BodySchema, BodyType } from './validation.schemas';

class V1UserEmailNotificationsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const notificationsService = container.get<NotificationsService>(SYMBOLS.NotificationsService);

    try {
      const auth = await authService
        .validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await notificationsService.upsertUserEmailPreferences(auth.getContext().currentRole.id, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserEmailNotificationsInfo.httpTrigger as AzureFunction, '/v1/email-preferences', {
  put: {
    description: 'Updates the user email preferences ',
    operationId: 'v1-email-notification-preferences-upsert',
    tags: ['[v1] Email Preferences'],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      204: {
        description: 'The user email preferences were updated successfully'
      }
    }
  }
});
