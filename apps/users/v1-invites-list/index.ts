import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';

class V1UserInvitesList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const authInstance = await authorizationService.validate(context).checkInnovatorType().verify();
      const requestUser = authInstance.getUserInfo();

      const result = await usersService.getCollaborationsInvitesList(requestUser.email);
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UserInvitesList.httpTrigger as AzureFunction, '/v1/invites', {
  get: {
    description: 'Get collaboration invites list',
    operationId: 'v1-invites-list',
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object'
              }
            }
          }
        }
      }
    }
  }
});
