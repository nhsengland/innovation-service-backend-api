import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { ResponseHelper } from '@users/shared/helpers';

import { container } from '../_config';

import { JwtDecoder } from '@users/shared/decorators';
import type { CustomContextType } from '@users/shared/types';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';

class V1MeCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const result = await usersService.createUserInnovator({ identityId: context.auth.user.identityId });
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

// TODO: update documentation.
export default openApi(V1MeCreate.httpTrigger as AzureFunction, '/v1/me', {
  post: {
    description: 'Create a new user on DB',
    operationId: 'v1-me-create',
    tags: ['[v1] Users'],
    responses: {
      200: {
        description: 'User created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
});
