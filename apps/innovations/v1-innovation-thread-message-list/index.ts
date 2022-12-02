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


class V1InnovationThreadMessageList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();


      let orderBy;

      if (queryParams.order) {
        orderBy = JSON.parse(queryParams.order);
      }

      const result = await threadsService.getThreadMessagesList(
        requestUser,
        pathParams.threadId,
        queryParams.skip,
        queryParams.take,
        orderBy,
      )


      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        messages: result.messages.map(message => ({
          id: message.id,
          createdAt: message.createdAt,
          createdBy: {
            id: message.createdBy.id,
            name: message.createdBy.name,
            type: message.createdBy.type,
            organisationUnit: {
              id: message.createdBy.organisationUnit?.id ?? '', // if the organisationUnit exists, then all props are ensured to exist
              name: message.createdBy.organisationUnit?.name ?? '',
              acronym: message.createdBy.organisationUnit?.acronym ?? '',
            },
            organisation: {
              id: message.createdBy.organisation?.id ?? '', // if the organisation exists, then all props are ensured to exist
              name: message.createdBy.organisation?.name ?? '',
              acronym: message.createdBy.organisation?.acronym ?? '',
            },
          },
          isEditable: message.isEditable,
          isNew: message.isNew,
          message: message.message,
          updatedAt: message.updatedAt,
        })),
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationThreadMessageList.httpTrigger as AzureFunction, '/v1/{innovationId}/threads/{threadId}/messages', {
  get: {
    summary: 'Get a list of messages from a thread',
    description: 'Get a list of messages from a thread',
    operationId: 'v1-innovation-thread-message-list',
    tags: ['Innovation Thread'],
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'Innovation ID',
        required: true,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'threadId',
        in: 'path',
        description: 'Thread ID',
        required: true,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'skip',
        in: 'query',
        description: 'Number of records to skip',
        required: false,
        schema: {
          type: 'number',
        },
      },
      {
        name: 'take',
        in: 'query',
        description: 'Number of records to take',
        required: false,
        schema: {
          type: 'number',
        },
      },
      {
        name: 'order',
        in: 'query',
        description: 'Order of the records',
        required: false,
        schema: {
          type: 'string',
          enum: ['ASC', 'DESC'],
        },
      },
    ],
    responses: {
      200: {
        description: 'Returns a list of messages from a thread',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                },
                messages: {
                  type: 'array',
                  items: {
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
                            enum: ['INNOVATOR', 'ASSESSOR', 'ACCESSOR'],
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
                          organisation: {
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
                      isEditable: {
                        type: 'boolean',
                      },
                      isNew: {
                        type: 'boolean',
                      },
                      message: {
                        type: 'string',
                      },
                      updatedAt: {
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
        description: 'Bad request',
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
      404: {
        description: 'Not found',
      },
      500: {
        description: 'Internal server error',
      },
    },
  },
});

