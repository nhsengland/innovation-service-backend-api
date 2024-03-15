import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationCollaboratorInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsService>(
      SYMBOLS.InnovationCollaboratorsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();

      const collaborator = await innovationCollaboratorsService.getCollaboratorInfo(
        auth.getContext(),
        params.innovationId,
        params.collaboratorId
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: collaborator.id,
        email: collaborator.email,
        status: collaborator.status,
        role: collaborator.role,
        name: collaborator.name,
        innovation: {
          id: collaborator.innovation.id,
          name: collaborator.innovation.name,
          ...(collaborator.innovation.owner && {
            owner: {
              id: collaborator.innovation.owner.id,
              name: collaborator.innovation.owner.name
            }
          })
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

export default openApi(
  V1InnovationCollaboratorInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/collaborators/{collaboratorId}',
  {
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
                  role: {
                    type: 'string'
                  },
                  email: {
                    type: 'string'
                  },
                  status: {
                    type: 'string',
                    enum: ['PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED', 'REMOVED', 'LEFT', 'EXPIRED']
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
  }
);
