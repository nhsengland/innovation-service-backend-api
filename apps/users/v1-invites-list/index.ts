import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, type AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';


class V1UserInvitesList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {
      const authInstance = await authorizationService.validate(context)
        .checkInnovatorType()
        .verify();
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
                type: 'object',
              },
            },
          },
        },
      },
    },
  },
});