import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationThreadCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .verify();

      const domainContext = auth.getContext();

      let orderBy;

      if (queryParams.order) {
        orderBy = JSON.parse(queryParams.order);
      }

      const result = await threadsService.getInnovationThreads(
        domainContext,
        pathParams.innovationId,
        queryParams.skip,
        queryParams.take,
        orderBy,
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        threads: result.threads.map(thread => ({
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
              ...thread.lastMessage.createdBy.isOwner !== undefined && { isOwner: thread.lastMessage.createdBy.isOwner },
              organisationUnit: {
                id: thread.lastMessage.createdBy.organisationUnit?.id ?? '', // if the organisationUnit exists, then all props are ensured to exist
                name: thread.lastMessage.createdBy.organisationUnit?.name ?? '', // if the organisationUnit exists, then all props are ensured to exist
                acronym: thread.lastMessage.createdBy.organisationUnit?.acronym ?? '', // if the organisationUnit exists, then all props are ensured to exist
              },
            },
          },
        })),
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
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'Innovation Id',
        required: true,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'skip',
        in: 'query',
        description: 'Skip',
        required: false,
        schema: {
          type: 'number',
        },
      },
      {
        name: 'take',
        in: 'query',
        description: 'Take',
        required: false,
        schema: {
          type: 'number',
        },
      },
      {
        name: 'order',
        in: 'query',
        description: 'Order',
        required: false,
        schema: {
          type: 'string',
        },
      },
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                },
                threads: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                      },
                      subject: {
                        type: 'string',
                      },
                      messageCount: {
                        type: 'number',
                      },
                      createdAt: {
                        type: 'string',
                      },
                      isNew: {
                        type: 'boolean',
                      },
                      lastMessage: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                          createdAt: {
                            type: 'string',
                          },
                          createdBy: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                              },
                              name: {
                                type: 'string',
                              },
                              type: {
                                type: 'string',
                              },
                              organisationUnit: {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                  },
                                  name: {
                                    type: 'string',
                                  },
                                  acronym: {
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