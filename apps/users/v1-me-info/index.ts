import type { AzureFunction } from '@azure/functions';
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { DomainServiceSymbol, DomainServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types'

import { container } from '../_config';
import type { ResponseDTO } from './transformation.dtos';


class GetMe {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);

    const requestUserId = context.auth.user.identityId;

    try {

      const result = await domainService.users.getUserInfo({ identityId: requestUserId });
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        email: result.email,
        displayName: result.displayName,
        type: result.type,
        roles: result.roles,
        phone: result.phone,
        passwordResetOn: result.passwordResetOn,
        organisations: result.organisations
      });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }
  }
}



export default openApi(GetMe.httpTrigger as AzureFunction, '/v1/me', {
  get: {
    parameters: [
      {
        name: 'gameId',
        in: 'path',
        required: true,
        description: `Gets a game that's being played`,
        schema: {
          type: 'string'
        }
      }
    ],
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

