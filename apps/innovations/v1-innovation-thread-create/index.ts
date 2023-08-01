import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationThreadCreate {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    target: TargetEnum.THREAD,
    identifierResponseField: 'thread.id'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(pathParams.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await threadsService.createEditableThread(
        requestUser,
        domainContext,
        pathParams.innovationId,
        body.subject,
        body.message,
        true
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        thread: {
          id: result.thread.id,
          subject: result.thread.subject,
          createdBy: {
            id: result.thread.createdBy
          },
          createdAt: result.thread.createdAt
        }
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationThreadCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads', {
  post: {
    summary: 'Create a new editable thread',
    description: 'Create a new editable thread.',
    tags: ['Innovation Threads'],
    operationId: 'v1-innovation-thread-create',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'The innovation id.',
        required: true,
        schema: {
          type: 'string'
        }
      }
    ],
    requestBody: {
      description: 'The thread details.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              subject: {
                type: 'string',
                description: 'The thread subject.',
                example: 'Subject'
              },
              message: {
                type: 'string',
                description: 'The thread message.',
                example: 'Message'
              }
            },
            required: ['subject', 'message']
          }
        }
      }
    },
    responses: {
      '200': {
        description: 'The thread was created successfully.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                thread: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'The thread id.',
                      example: '00000000-0000-0000-0000-000000000000'
                    },
                    subject: {
                      type: 'string',
                      description: 'The thread subject.',
                      example: 'Subject'
                    },
                    createdBy: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'The user id.',
                          example: '00000000-0000-0000-0000-000000000000'
                        }
                      }
                    },
                    createdAt: {
                      type: 'string',
                      description: 'The thread creation date.',
                      example: '2021-01-01T00:00:00.000Z'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'The request was invalid.'
      },
      '401': {
        description: 'The user is not authenticated.'
      },
      '403': {
        description: 'The user is not authorized to create a thread.'
      },
      '404': {
        description: 'The innovation does not exist.'
      },
      '500': {
        description: 'An error occurred while creating the thread.'
      }
    }
  }
});
