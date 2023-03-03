import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationCollaboratorsServiceSymbol, InnovationCollaboratorsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationCollaboratorInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsServiceType>(InnovationCollaboratorsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .verify();

      const collaborator = await innovationCollaboratorsService.getCollaboratorInfo(auth.getContext(), params.innovationId, params.collaboratorId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: collaborator.id,
        email: collaborator.email,
        status: collaborator.status,
        collaboratorRole: collaborator.collaboratorRole,
        name: collaborator.name,
        innovation: {
          id: collaborator.innovation.id,
          name: collaborator.innovation.name,
          description: collaborator.innovation.description,
          owner: {
            id: collaborator.innovation.owner.id,
            name: collaborator.innovation.owner.name,
          }
        },
        invitedAt: collaborator.invitedAt
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationCollaboratorInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/collaborators/{collaboratorId}', {
  get: {
    description: 'Get a collaborator information.',
    operationId: 'v1-innovation-collaborator-info',
    tags: ['[v1] Innovation Collaborators'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'The innovation collaborator information.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid'
                },
                name: {
                  type: 'string'
                },
                collaboratorRole: {
                  type: 'string'
                },
                email: {
                  type: 'string'
                },
                status: {
                  type: 'string',
                  enum: [
                    'PENDING',
                    'ACTIVE',
                    'DECLINED',
                    'CANCELLED',
                    'REMOVED',
                    'LEFT',
                    'EXPIRED',
                  ]
                },
                invitedAt: {
                  type: 'string',
                  format: 'date-time'
                },
                innovation: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid'
                    },
                    name: {
                      type: 'string'
                    },
                    description: {
                      type: 'string'
                    },
                    owner: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid'
                        },
                        name: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      404: {
        description: 'Not Found'
      }
    }
  }
});
