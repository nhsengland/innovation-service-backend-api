import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUnitActivate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.activateUnit(
        auth.getContext(),
        params.organisationId,
        params.organisationUnitId,
        body.userIds
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ unitId: result.unitId });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUnitActivate.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}/units/{organisationUnitId}/activate',
  {
    patch: {
      description: 'Activate an organisation unit.',
      operationId: 'v1-admin-unit-activate',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The id of the users to unlock.' }),
      responses: {
        '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'The organisation unit has been activated.'
        }),
        '400': {
          description: 'Bad request.'
        },
        '401': {
          description: 'The user is not authorized to activate an organisation unit.'
        },
        '404': {
          description: 'The organisation unit does not exist.'
        },
        '500': {
          description: 'An error occurred while activating the organisation unit.'
        }
      }
    }
  }
);
