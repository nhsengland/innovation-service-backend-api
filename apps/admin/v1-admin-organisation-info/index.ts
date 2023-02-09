import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
} from '@admin/shared/services';
import { OrganisationsServiceSymbol, OrganisationsServiceType } from '../_services/interfaces';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';

class V1AdminOrganisationInfo {
  @JwtDecoder()
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsServiceType>(OrganisationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .checkAdminType()
        .verify();

      const result = await organisationsService.getOrganisationInfo(params.organisationId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminOrganisationInfo.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}',
  {
    get: {
      description: 'Get organisation info.',
      operationId: 'v1-admin-organisation-info',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'Success.'
        },
        '400': {
          description: 'Bad request.',
        },
        '401': {
          description: 'The user is not authorized to get this information.',
        },
        '500': {
          description: 'An error occurred while getting this information.',
        },
      },
    },
  }
);
