import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';
import { AdminServiceSymbol, AdminServiceType } from '../_services/interfaces';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationActionUpdate {
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
      
      await adminService.inactivateUnit(
        requestUser,
        params.organisationUnitId
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: requestUser.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationActionUpdate.httpTrigger as AzureFunction,
  '/v1/organisations/{organisationId}/units/{organisationUnitId}/inactivate',
  {
    patch: {
      description: 'Inactivate an organisation unit.',
      operationId: 'v1-admin-inactivate-unit',
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
          description: 'The organisation unit has been inactivated..',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The organisation unit id.',
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'The organisation unit data is invalid.',
        },
        '401': {
          description:
            'The user is not authorized to inactivate an organisation unit.',
        },
        '404': {
          description: 'The organisation unit does not exist.',
        },
        '500': {
          description:
            'An error occurred while inactivating the organisation unit.',
        },
      },
    },
  }
);
