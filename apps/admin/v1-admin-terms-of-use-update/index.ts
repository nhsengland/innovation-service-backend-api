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

import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';

class V1AdminTermsOfUseUpdate {
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

        const params = JoiHelper.Validate<ParamsType>(
            ParamsSchema,
            request.params
        )

        const body = JoiHelper.Validate<BodyType>(
            BodySchema,
            request.body
        );

        const auth = await authorizationService
            .validate(context.auth.user.identityId)
            .checkAdminType()
            .verify();

        const requestUser = auth.getUserInfo()

        const result = await adminToUService.updateTermsOfUse(
            { id: requestUser.id },
            body,
            params.touId
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
  V1AdminTermsOfUseUpdate.httpTrigger as AzureFunction,
  '/v1/tou/{touId}',
  {
    put: {
      description: 'Update terms of use.',
      operationId: 'v1-admin-terms-of-use-update',
      parameters: [
        {
          name: 'touId',
          in: 'path',
          description: 'The terms of use id.',
          required: true,
          schema: {
            type: 'string',
          },
        }
      ],
      requestBody: {
        description: 'The updated terms of use.',
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
          description: 'The terms of use have been updated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unitId: {
                    type: 'string',
                    description: 'Id of the updated terms of use.',
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
          description: 'The user is not authorized to update terms of use.',
        },
        '500': {
          description: 'An error occurred while updating the terms of use.',
        },
      },
    },
  }
);
