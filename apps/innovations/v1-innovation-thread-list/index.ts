import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationThreadCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await threadsService.getInnovationThreads(auth.getContext(), params.innovationId, queryParams);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(thread => ({
          id: thread.id,
          subject: thread.subject,
          messageCount: thread.messageCount,
          createdAt: thread.createdAt,
          isNew: thread.isNew,
          lastMessage: {
            id: thread.lastMessage.id,
            createdAt: thread.lastMessage.createdAt,
            createdBy: {
              id: thread.lastMessage.createdBy.id,
              name: thread.lastMessage.createdBy.name,
              type: thread.lastMessage.createdBy.role,
              ...(thread.lastMessage.createdBy.isOwner !== undefined && {
                isOwner: thread.lastMessage.createdBy.isOwner
              }),
              organisationUnit: {
                id: thread.lastMessage.createdBy.organisationUnit?.id ?? '', // if the organisationUnit exists, then all props are ensured to exist
                name: thread.lastMessage.createdBy.organisationUnit?.name ?? '', // if the organisationUnit exists, then all props are ensured to exist
                acronym: thread.lastMessage.createdBy.organisationUnit?.acronym ?? '' // if the organisationUnit exists, then all props are ensured to exist
              }
            }
          }
        }))
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationThreadCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads', {
  get: {
    summary: 'Get Innovation Threads',
    description: 'Get Innovation Threads',
    tags: ['Innovation Threads'],
    operationId: 'v1-innovation-thread-list',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: QueryParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number'
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string'
                      },
                      subject: {
                        type: 'string'
                      },
                      messageCount: {
                        type: 'number'
                      },
                      createdAt: {
                        type: 'string'
                      },
                      isNew: {
                        type: 'boolean'
                      },
                      lastMessage: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string'
                          },
                          createdAt: {
                            type: 'string'
                          },
                          createdBy: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string'
                              },
                              name: {
                                type: 'string'
                              },
                              type: {
                                type: 'string'
                              },
                              organisationUnit: {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string'
                                  },
                                  name: {
                                    type: 'string'
                                  },
                                  acronym: {
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
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }
});
