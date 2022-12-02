import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationThreadMessageUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await threadsService.updateThreadMessage(
        requestUser,
        pathParams.messageId,
        { message: body.message },
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationThreadMessageUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads/{threadId}/messages/{messageId}', {
  put: {
    summary: 'Update a thread message',
    description: 'Update a thread message',
    tags: ['Innovation Thread'],
    operationId: 'v1-innovation-thread-message-update',
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
        name: 'threadId',
        in: 'path',
        description: 'Thread Id',
        required: true,
        schema: {
          type: 'string',
        },
      },
      {
        name: 'messageId',
        in: 'path',
        description: 'Message Id',
        required: true,
        schema: {
          type: 'string',
        },
      },
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
                description: 'Message',
              },
            },
          },
        },
      },
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
                  description: 'Message Id',
                },
              },
            },
          },
        },
      },
      '400': {
        description: 'Bad Request',
      },
      '401': {
        description: 'Unauthorized',
      },
      '403': {
        description: 'Forbidden',
      },
      '404': {
        description: 'Not Found',
      },
      '500': {
        description: 'Internal Server Error',
      },
    },
  },
});

