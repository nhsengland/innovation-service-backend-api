import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationsActivitiesLogList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const innovation = auth.getInnovationInfo();

      const { skip, take, order, ...filters } = queryParams;

      const result = await innovationsService.getInnovationActivitiesLog(params.innovationId, filters, {
        skip,
        take,
        order
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        innovation: { id: innovation.id, name: innovation.name },
        data: result.data.map(item => ({
          type: item.type,
          activity: item.activity,
          date: item.date,
          params: item.params
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationsActivitiesLogList.httpTrigger as AzureFunction, '/v1/{innovationId}/activities', {
  get: {
    operationId: 'v1-innovation-activities-log-list',
    description: 'Get activities log list of an Innovation',
    tags: ['[v1] Innovation Activities Log'],
    parameters: SwaggerHelper.paramJ2S( { query: QueryParamsSchema, path: ParamsSchema }),
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
                innovation: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string'
                    },
                    name: {
                      type: 'string'
                    }
                  }
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string'
                      },
                      activity: {
                        type: 'string'
                      },
                      date: {
                        type: 'number'
                      },
                      params: {
                        type: 'object',
                        properties: {
                          actionUserId: {
                            type: 'string'
                          },
                          interveningUserId: {
                            type: 'string'
                          },
                          assessmentId: {
                            type: 'string'
                          },
                          sectionId: {
                            type: 'string'
                          },
                          actionId: {
                            type: 'string'
                          },
                          innovationSupportStatus: {
                            type: 'string'
                          },
                          organisations: {
                            type: 'array',
                            items: {
                              type: 'string'
                            }
                          },
                          organisationUnit: {
                            type: 'string'
                          },
                          comment: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string'
                              },
                              value: {
                                type: 'string'
                              }
                            }
                          },
                          totalActions: {
                            type: 'number'
                          },
                          thread: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string'
                              },
                              subject: {
                                type: 'string'
                              },
                              messageId: {
                                type: 'string'
                              }
                            }
                          },
                          actionUserName: {
                            type: 'string'
                          },
                          interveningUserName: {
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
      },
      500: {
        description: 'An error occurred while processing the request.'
      }
    }
  }
});
