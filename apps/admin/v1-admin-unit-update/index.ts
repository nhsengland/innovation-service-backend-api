import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUnitUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await organisationsService.updateUnit(params.organisationUnitId, body.name, body.acronym);

      context.res = ResponseHelper.Ok<ResponseDTO>({ unitId: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUnitUpdate.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}/units/{organisationUnitId}',
  {
    patch: {
      description: 'Update an organisation unit.',
      operationId: 'v1-admin-unit-update',
      parameters: [
        {
          name: 'organisationId',
          in: 'path',
          description: 'The organisation id.',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'organisationUnitId',
          in: 'path',
          description: 'The organisation unit id.',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ],
      requestBody: {
        description: 'New name and acronym for the unit.',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userIds: {
                  type: 'string',
                  description: 'Name and acronym for the unit.'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'The organisation unit has been updated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unitId: {
                    type: 'string',
                    description: 'The organisation unit id.'
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
          description: 'The user is not authorized to update an organisation unit.'
        },
        '404': {
          description: 'The organisation unit does not exist.'
        },
        '500': {
          description: 'An error occurred while updating the organisation unit.'
        }
      }
    }
  }
);
