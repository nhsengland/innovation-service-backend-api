import type { AzureFunction } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types'

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1MeInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId).verify();
      const requestUser = authInstance.getUserInfo();

      const userInnovationTransfers = await usersService.getUserPendingInnovationTransfers(requestUser.email);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: requestUser.id,
        email: requestUser.email,
        displayName: requestUser.displayName,
        type: requestUser.type,
        roles: requestUser.roles,
        phone: requestUser.phone,
        passwordResetAt: requestUser.passwordResetAt,
        firstTimeSignInAt: requestUser.firstTimeSignInAt,
        termsOfUseAccepted: requestUser.termsOfUseAccepted,
        hasInnovationTransfers: userInnovationTransfers.length > 0,
        organisations: requestUser.organisations
      });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }

  }

}


// TODO: Improve response
export default openApi(V1MeInfo.httpTrigger as AzureFunction, '/v1/me', {
  get: {
    parameters: [],
    responses: {
      200: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for the game' },
                state: { type: 'string', description: 'The status of the game', enum: ['WaitingForPlayers', 'Started', 'Complete'] }
              }
            }
          }
        }
      },
      404: { description: 'Unable to find a game with that id' }
    }
  }
});
