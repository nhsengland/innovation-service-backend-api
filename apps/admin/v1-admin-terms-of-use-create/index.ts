import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
} from '@admin/shared/services';
import { AdminTermsOfUseServiceSymbol, AdminTermsOfUseServiceType } from '../_services/interfaces';
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
    const adminToUService = container.get<AdminTermsOfUseServiceType>(AdminTermsOfUseServiceSymbol);

    try {

        const body = JoiHelper.Validate<BodyType>(
            BodySchema,
            request.body
        );

        const auth = await authorizationService
            .validate(context.auth.user.identityId)
            .checkAdminType()
            .verify();

        const requestUser = auth.getUserInfo()

        const result = await adminToUService.createTermsOfUse(
            { id: requestUser.id },
            body
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
        return;
    } catch (error) {
        context.res = ResponseHelper.Error(context, error);
        return;
    }
  }
}

export default openApi(
  V1AdminOrganisationCreate.httpTrigger as AzureFunction,
  '/v1/tou',
  {
    post: {
      description: 'Create terms of use.',
      operationId: 'v1-admin-terms-of-use-create',
      requestBody: {
        description: 'The terms of use to create.',
        required: true,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name of the terms of use.'
                        },
                        touType: {
                            type: 'string',
                            description: 'Type of the terms of use.'
                        },
                        summary: {
                            type: 'string',
                            description: 'Brief summary of the terms of use.' 
                        },
                        releasedAt: {
                            type: 'string',
                            description: 'Relase date of the terms of use.'
                        }
                    }
                }
            }
        }
      },
      responses: {
        '200': {
          description: 'The terms of use have been created.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unitId: {
                    type: 'string',
                    description: 'Id of the created terms of use.',
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
          description: 'The user is not authorized to create terms of use.',
        },
        '500': {
          description: 'An error occurred while creating the terms of use.',
        },
      },
    },
  }
);
