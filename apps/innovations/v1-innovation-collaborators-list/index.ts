import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@innovations/shared/decorators';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import {
  InnovationCollaboratorsServiceSymbol,
  InnovationCollaboratorsServiceType,
} from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationCollaboratorsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsServiceType>(
      InnovationCollaboratorsServiceSymbol
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationCollaboratorsService.getCollaboratorsList(
        params.innovationId,
        filters,
        { skip, take, order }
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map((collaborator) => ({
          id: collaborator.id,
          status: collaborator.status,
          ...([
            ServiceRoleEnum.ADMIN,
            ServiceRoleEnum.ASSESSMENT,
            ServiceRoleEnum.INNOVATOR,
          ].includes(domainContext.currentRole.role) && { email: collaborator.email }),
          ...(collaborator.role && { role: collaborator.role }),
          ...(collaborator.name && { name: collaborator.name }),
        })),
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationCollaboratorsList.httpTrigger as AzureFunction,
  '/v1/{innovationId}/collaborators',
  {
    get: {
      description: 'Get a list of innovation collaborators.',
      operationId: 'v1-innovation-collaborators-list',
      tags: ['[v1] Innovation Collaborators'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'The list of innovation collaborators.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: {
                    type: 'integer',
                    description: 'The total number of records.',
                  },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                        },
                        name: {
                          type: 'string',
                        },
                        role: {
                          type: 'string',
                        },
                        email: {
                          type: 'string',
                        },
                        status: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'The request is invalid.',
        },
        401: {
          description: 'The user is not authenticated.',
        },
        403: {
          description: 'The user is not authorized to access this resource.',
        },
        500: {
          description: 'An error occurred while processing the request.',
        },
      },
    },
  }
);
