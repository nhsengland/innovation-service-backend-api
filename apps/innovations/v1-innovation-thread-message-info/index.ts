import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema } from './validation.schemas';


class V1InnovationThreadMessageInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const result = await threadsService.getThreadMessageInfo(
        pathParams.messageId,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        message: result.message,
        createdAt: result.createdAt,
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(V1InnovationThreadMessageInfo.httpTrigger as AzureFunction, '/v1/innovation/{innovationId}/threads/{threadId}/messages/{messageId}', {
  get: {
    summary: 'Get a thread message info',
    description: 'Get a thread message info',
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
        name: 'messageId',
        in: 'path',
        description: 'Message ID',
        required: true,
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
                id: {
                  type: 'string',
                  description: 'Message ID',
                },
                message: {
                  type: 'string',
                  description: 'Message',
                },
                createdAt: {
                  type: 'string',
                  description: 'Message creation date',
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
