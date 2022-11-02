import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationShares {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .verify();

      const result = await innovationsService.getInnovationShares(params.innovationId) || [];
      context.res = ResponseHelper.Ok<ResponseDTO>(result.map(item => ({
        organisation: {
          id: item.organisation.id,
          name: item.organisation.name,
          acronym: item.organisation.acronym
        }
      })));
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationShares.httpTrigger as AzureFunction, 'v1/{innovationId}/shares', {
  get: {
    description: 'Get all the shares for an innovation.',
    tags: ['Innovation'],
    summary: 'Get all the shares for an innovation.',
    operationId: 'v1-innovation-shares',
    parameters: [],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The unique identifier of the share.',
                  },
                  innovationId: {
                    type: 'string',
                    description: 'The unique identifier of the innovation.',
                  },
                  organisationId: {
                    type: 'string',
                    description: 'The unique identifier of the organisation.',
                  },
                  organisationName: {
                    type: 'string',
                    description: 'The name of the organisation.',
                  },
                  organisationUnitId: {
                    type: 'string',
                    description: 'The unique identifier of the organisation unit.',
                  },
                  organisationUnitName: {
                    type: 'string',
                    description: 'The name of the organisation unit.',
                  },
                  status: {
                    type: 'string',
                    description: 'The status of the share.',
                  },
                  createdAt: {
                    type: 'string',
                    description: 'The date and time when the share was created.',
                  },
                  updatedAt: {
                    type: 'string',
                    description: 'The date and time when the share was last updated.',
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
      404: {
        description: 'Not Found',
      },
      500: {
        description: 'Internal Server Error',
      },
    },
  },
});
