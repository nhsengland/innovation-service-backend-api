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
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1AdminOrganisationCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.createOrganisation(auth.getContext(), body);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id, units: result.units });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminOrganisationCreate.httpTrigger as AzureFunction, '/v1/organisations', {
  post: {
    description: 'Create an organisation.',
    operationId: 'v1-admin-organisation-create',
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The organisation to be created.'
    }),
    responses: {
      '200': {
        description: 'The organisation has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The organisation id.'
                },
                units: {
                  type: 'string',
                  description: 'Ids of the organisation units belonging to the organisation.'
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
        description: 'The user is not authorized to create an organisation.'
      },
      '500': {
        description: 'An error occurred while creating the organisation.'
      }
    }
  }
});
