import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1UserEmailAvailable {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await usersService.existsUserByEmail(queryParams.email);
      context.res = result ? ResponseHelper.Ok({}) : ResponseHelper.NotFound();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserEmailAvailable.httpTrigger as AzureFunction, '/v1', {
  head: {
    operationId: 'v1-users-email-available',
    description: 'Check if email is available for a new user.',
    tags: ['[v1] Users'],
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
    responses: {
      200: { description: 'Email is already in use.' },
      404: { description: 'Email is available.' },
    },
  },
});
