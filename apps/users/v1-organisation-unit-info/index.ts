import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1OrganisationUnitInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.getOrganisationUnitInfo(params.organisationUnitId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1OrganisationUnitInfo.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}/units/{organisationUnitId}',
  {
    get: {
      description: 'Get organisation unitinfo.',
      operationId: 'v1-organisation-unit-info',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'Success.'
        },
        '400': {
          description: 'Bad request.'
        },
        '401': {
          description: 'The user is not authorized to get this information.'
        },
        '500': {
          description: 'An error occurred while getting this information.'
        }
      }
    }
  }
);
