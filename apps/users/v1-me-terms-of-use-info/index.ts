import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1MeTermsOfUseInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const termsOfUseService = container.get<TermsOfUseServiceType>(TermsOfUseServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .verify();
      const requestUser = authInstance.getUserInfo();

      const result = await termsOfUseService.getActiveTermsOfUseInfo({ id: requestUser.id, type: requestUser.type });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        name: result.name,
        summary: result.summary,
        releasedAt: result.releasedAt,
        isAccepted: result.isAccepted
      });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(context, error);
      return;

    }

  }

}


// TODO: Improve response
export default openApi(V1MeTermsOfUseInfo.httpTrigger as AzureFunction, '/v1/me/terms-of-use', {
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
