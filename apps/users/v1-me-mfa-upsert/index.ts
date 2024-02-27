import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import { BodyType, BodySchema } from './validation.schemas';

class V1MeMfaUpsert {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAssessmentType()
        .checkAccessorType()
        .checkAdminType()
        .verify();

      await usersService.upsertUserMfa(auth.getContext(), body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeMfaUpsert.httpTrigger as AzureFunction, '/v1/me/mfa', {
  put: {
    description: 'Upsert user MFA configuration',
    operationId: 'v1-me-mfa-upsert',
    tags: ['[v1] Users'],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      204: { description: 'MFA information upserted' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' },
      500: { description: 'Internal Server Error' }
    }
  }
});
