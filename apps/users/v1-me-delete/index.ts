import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import { BodySchema, BodyType } from './validation.schemas';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';

class V1MeDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();

      await usersService.deleteUser(auth.getContext(), { reason: body.reason });

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeDelete.httpTrigger as AzureFunction, '/v1/me/delete', {
  patch: {
    description: 'User delete',
    operationId: 'v1-me-delete',
    tags: ['[v1] Users'],
    parameters: [],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'Reason for deletion' }),
    responses: {
      204: { description: 'User deleted successfully' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' }
    }
  }
});
