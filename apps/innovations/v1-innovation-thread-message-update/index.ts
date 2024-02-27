import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationThreadMessageUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      // Not checking innovation access as it is done in the service where only the person that created the message
      // can alter it.
      const auth = await authorizationService
        .validate(context)
        .setInnovation(pathParams.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .checkNotArchived()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await threadsService.updateThreadMessage(requestUser, pathParams.messageId, {
        message: body.message
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadMessageUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/messages/{messageId}',
  {
    put: {
      summary: 'Update a thread message',
      description: 'Update a thread message',
      tags: ['[v1] Innovation Threads'],
      operationId: 'v1-innovation-thread-message-update',
      parameters: [
        {
          name: 'innovationId',
          in: 'path',
          description: 'Innovation Id',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'threadId',
          in: 'path',
          description: 'Thread Id',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'messageId',
          in: 'path',
          description: 'Message Id',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ],
      requestBody: {
        description: 'Message',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Message'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Message Id'
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Bad Request'
        },
        '401': {
          description: 'Unauthorized'
        },
        '403': {
          description: 'Forbidden'
        },
        '404': {
          description: 'Not Found'
        },
        '500': {
          description: 'Internal Server Error'
        }
      }
    }
  }
);
