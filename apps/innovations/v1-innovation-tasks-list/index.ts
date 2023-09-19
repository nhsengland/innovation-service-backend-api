import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTasksService } from '../_services/innovation-tasks.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationTasksList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTasksService = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const authInstance = await authorizationService
        .validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .verify();
      const domainContext = authInstance.getContext();

      const result = await innovationTasksService.getTasksList(domainContext, filters, {
        skip,
        take,
        order
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(item => ({
          id: item.id,
          displayId: item.displayId,
          status: item.status,
          description: item.description,
          innovation: { id: item.innovation.id, name: item.innovation.name },
          section: item.section,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          updatedBy: {
            name: item.updatedBy.name,
            role: item.updatedBy.role
          },
          createdBy: { ...item.createdBy },
          ...(item.notifications === undefined ? {} : { notifications: item.notifications })
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTasksList.httpTrigger as AzureFunction, '/v1/tasks', {
  get: {
    description: 'Get a list of innovation tasks.',
    operationId: 'v1-innovation-tasks-list',
    tags: ['[v1] Innovation Tasks'],
    parameters: [
      {
        name: 'skip',
        in: 'query',
        required: false,
        description: 'The number of records to skip.',
        schema: {
          type: 'integer',
          minimum: 0
        }
      },
      {
        name: 'take',
        in: 'query',
        required: false,
        description: 'The number of records to take.',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100
        }
      },
      {
        name: 'order',
        in: 'query',
        required: false,
        description: 'The order of the records.',
        schema: {
          type: 'string'
        }
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        description: 'The status of the task.',
        schema: {
          type: 'string'
        }
      },
      {
        name: 'section',
        in: 'query',
        required: false,
        description: 'The section of the task.',
        schema: {
          type: 'string'
        }
      },
      {
        name: 'innovationId',
        in: 'query',
        required: false,
        description: 'The innovation id of the task.',
        schema: {
          type: 'string'
        }
      },
      {
        name: 'innovationName',
        in: 'query',
        required: false,
        description: 'The innovation name of the task.',
        schema: {
          type: 'string'
        }
      }
    ],
    responses: {
      200: {
        description: 'The list of innovation tasks.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                count: {
                  type: 'integer',
                  description: 'The total number of records.'
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'The id of the task.'
                      },
                      displayId: {
                        type: 'string',
                        description: 'The display id of the task.'
                      },
                      status: {
                        type: 'string',
                        description: 'The status of the task.'
                      },
                      description: {
                        type: 'string',
                        description: 'The description of the task.'
                      },
                      section: {
                        type: 'string',
                        description: 'The section of the task.'
                      },
                      createdAt: {
                        type: 'string',
                        description: 'The date the task was created.'
                      },
                      updatedAt: {
                        type: 'string',
                        description: 'The date the task was last updated.'
                      },
                      innovation: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            description: 'The id of the innovation.'
                          },
                          name: {
                            type: 'string',
                            description: 'The name of the innovation.'
                          }
                        }
                      },
                      notifications: {
                        type: 'object',
                        properties: {
                          count: {
                            type: 'integer',
                            description: 'The number of notifications for the task.'
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
      400: {
        description: 'The request is invalid.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to access this resource.'
      },
      500: {
        description: 'An error occurred while processing the request.'
      }
    }
  }
});
