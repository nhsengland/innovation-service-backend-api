import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
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

import { ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';

class V1AdminInactivateUnit {
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
      const params = JoiHelper.Validate<ParamsType>(
        ParamsSchema,
        request.params
      );

      const auth = await authorizationService
        .validate(context.auth.user.identityId)
        .checkAdminType()
        .verify();

      const requestUser = auth.getUserInfo();
      
      const result = await adminService.inactivateUnit(
        requestUser,
        params.organisationUnitId
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
  V1AdminInactivateUnit.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}/units/{organisationUnitId}/inactivate',
  {
    patch: {
      description: 'Inactivate an organisation unit.',
      operationId: 'v1-admin-unit-inactivate',
      parameters: [
        {
          name: 'organisationId',
          in: 'path',
          description: 'The organisation id.',
          required: true,
          schema: {
            type: 'string',
          },
        },
        {
          name: 'organisationUnitId',
          in: 'path',
          description: 'The organisation unit id.',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        '200': {
          description: 'The organisation unit has been inactivated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unitId: {
                    type: 'string',
                    description: 'The organisation unit id.',
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
          description: 'The user is not authorized to inactivate an organisation unit.',
        },
        '404': {
          description: 'The organisation unit does not exist.',
        },
        '500': {
          description: 'An error occurred while inactivating the organisation unit.',
        },
      },
    },
  }
);
