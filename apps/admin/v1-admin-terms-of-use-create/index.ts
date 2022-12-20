import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType } from '../_services/interfaces';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { BodySchema, BodyType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1AdminTermsOfUseCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const toUService = container.get<TermsOfUseServiceType>(TermsOfUseServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkAdminType()
        .verify();
      const requestUser = auth.getUserInfo()

      const result = await toUService.createTermsOfUse({ id: requestUser.id }, body);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1AdminTermsOfUseCreate.httpTrigger as AzureFunction, '/v1/tou', {
  post: {
    description: 'Create terms of use.',
    operationId: 'v1-admin-terms-of-use-create',
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The terms of use to create.' }),
    responses: {
      '200': {
        description: 'The terms of use have been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                unitId: { type: 'string', description: 'Id of the created terms of use.' }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad request.',
      },
      '401': {
        description: 'The user is not authorized to create terms of use.',
      },
      '500': {
        description: 'An error occurred while creating the terms of use.',
      }
    }
  }
});
