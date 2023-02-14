import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { PathParamsSchema, PathParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1UsersInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<PathParamsType>(PathParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      // Only admins can get other user info (for now at least)
      await authorizationService.validate(context)
          .checkAdminType()
          .verify();

      const user = await usersService.getUserById(pathParams.userId, queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>(user);

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

// TODO this needs to be improved
export default openApi(V1UsersInfo.httpTrigger as AzureFunction, '/v1/{userId}', {
  get: {
    operationId: 'v1-users-info',
    description: 'Get user info',
    tags: ['[v1] Users'],
    parameters: SwaggerHelper.paramJ2S({path: PathParamsSchema, query: QueryParamsSchema}),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for user object' },
              }
            }
          }
        }
      },
      403: { description: 'Forbidden' },
    }
  }
});
