import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

class V1AdminUserLock {
  @JwtDecoder()
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {
      const params = JoiHelper.Validate<ParamsType>(
        ParamsSchema,
        request.params
      );

      await authorizationService
        .validate(context.auth.user.identityId)
        .checkAdminType()
        .verify();
      
      const result = await usersService.lockUser(params.userId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUserLock.httpTrigger as AzureFunction,
  '/v1/users/{userId}/lock',
  {
    patch: {
      description: 'Lock a user.',
      operationId: 'v1-admin-user-lock',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'The user has been locked.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'Id of the user.',
                  }
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request.',
        },
        '401': {
          description: 'The user is not authorized to lock a user.',
        },
        '404': {
          description: 'The user does not exist.',
        },
        '500': {
          description: 'An error occurred while locking a user.',
        },
      },
    },
  }
);
