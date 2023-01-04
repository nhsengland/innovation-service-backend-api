import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1MeTermsOfUseAccept {

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

      const result = await termsOfUseService.acceptActiveTermsOfUse({ id: requestUser.id, type: requestUser.type });

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(context, error);
      return;

    }

  }

}


// TODO: Improve response
export default openApi(V1MeTermsOfUseAccept.httpTrigger as AzureFunction, '/v1/me/terms-of-use/accept', {
  patch: {
    description: 'Accept user terms of use',
    operationId: 'v1-me-terms-of-use-accept',
    tags: ['[v1] Terms of Use'],
    parameters: [],
    responses: {
      200: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Operation identifier' }
              }
            }
          }
        }
      },
      422: {description: 'Unprocessable Entity'},
    }
  }
});
