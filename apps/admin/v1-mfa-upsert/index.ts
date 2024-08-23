import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1MfaUpsert {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService.validate(context).checkAdminType().verify();

      await usersService.upsertUserMfa(params.userId, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MfaUpsert.httpTrigger as AzureFunction, '/v1/{userId}/mfa', {
  put: {
    description: 'Upsert user MFA configuration',
    operationId: 'v1-mfa-upsert',
    tags: ['[v1] Users'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
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
