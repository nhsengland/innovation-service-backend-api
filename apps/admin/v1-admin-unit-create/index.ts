import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUnitCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.createUnit(params.organisationId, body.name, body.acronym);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminUnitCreate.httpTrigger as AzureFunction, '/v1/organisations/{organisationId}/units', {
  post: {
    description: 'Create an organisation unit.',
    operationId: 'v1-admin-unit-create',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The organisation unit to be created.'
    }),
    responses: {
      '200': {
        description: 'The organisation unit has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                unitId: {
                  type: 'string',
                  description: 'The organisation id.'
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad request.'
      },
      '401': {
        description: 'The user is not authorized to create an organisation unit.'
      },
      '500': {
        description: 'An error occurred while creating the organisation unit.'
      }
    }
  }
});
