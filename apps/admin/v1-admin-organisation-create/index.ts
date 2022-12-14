import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
} from '@admin/shared/services';
import { AdminServiceSymbol, AdminServiceType } from '../_services/interfaces';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { BodySchema, BodyType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';

class V1AdminOrganisationCreate {
  @JwtDecoder()
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const adminService = container.get<AdminServiceType>(AdminServiceSymbol);

    try {

        const body = JoiHelper.Validate<BodyType>(
            BodySchema,
            request.body
        );

        await authorizationService
            .validate(context.auth.user.identityId)
            .checkAdminType()
            .verify();

        const result = await adminService.createOrganisation(
            body.organisation
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id, units: result.units });
        return;
    } catch (error) {
        context.res = ResponseHelper.Error(context, error);
        return;
    }
  }
}

export default openApi(
  V1AdminOrganisationCreate.httpTrigger as AzureFunction,
  '/v1/organisations',
  {
    post: {
      description: 'Create an organisation unit.',
      operationId: 'v1-admin-organisation-create',
      requestBody: {
        description: 'The organisation to create.',
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name of the organisation.'
                        },
                        acronym: {
                            type: 'string',
                            description: 'Acronym of the organisation.'
                        },
                        unit: {
                            type: 'string',
                            description: 'Ids of the organistaion units.' 
                        }
                    }
                }
            }
        }
      },
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
                    description: 'The organisation id.',
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request.',
        },
        '401': {
          description: 'The user is not authorized to create an organisation.',
        },
        '500': {
          description: 'An error occurred while creating the organisation unit.',
        },
      },
    },
  }
);
