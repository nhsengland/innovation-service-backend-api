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
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationThreadMessageInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const result = await threadsService.getThreadMessageInfo(pathParams.messageId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        message: result.message,
        createdAt: result.createdAt
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadMessageInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/messages/{messageId}',
  {
    get: {
      summary: 'Get a thread message info',
      description: 'Get a thread message info',
      tags: ['[v1] Innovation Threads'],
      parameters: [
        {
          name: 'innovationId',
          in: 'path',
          description: 'Innovation ID',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'threadId',
          in: 'path',
          description: 'Thread ID',
          required: true,
          schema: {
            type: 'string'
          }
        },
        {
          name: 'messageId',
          in: 'path',
          description: 'Message ID',
          required: true,
          schema: {
            type: 'string'
          }
        }
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Message ID'
                  },
                  message: {
                    type: 'string',
                    description: 'Message'
                  },
                  createdAt: {
                    type: 'string',
                    description: 'Message creation date'
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
  }
);
