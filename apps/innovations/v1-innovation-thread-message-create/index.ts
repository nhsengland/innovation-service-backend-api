import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationThreadMessageCreate {

  @JwtDecoder()
  @Audit({action: ActionEnum.UPDATE, target: TargetEnum.THREAD, identifierParam: 'threadId'})
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await threadsService.createEditableMessage(
        requestUser,
        pathParams.threadId,
        body.message,
        true,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        threadMessage: {
          id: result.threadMessage.id,
          message: result.threadMessage.message,
          createdBy: {
            id: result.threadMessage.author.id,
            identityId: result.threadMessage.author.identityId,
          },
          createdAt: result.threadMessage.createdAt,
          isEditable: result.threadMessage.isEditable,
        }
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationThreadMessageCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads/{threadId}/messages', {
  post: {
    description: 'Creates a new message in a thread.',
    operationId: 'v1-innovation-thread-message-create',
    tags: ['[v1] Innovation Threads'],
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
    ],
    requestBody: {
      description: 'Message to be created.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to be created.',
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Message created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                threadMessage: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'Message ID.',
                    },
                    message: {
                      type: 'string',
                      description: 'Message.',
                    },
                    createdBy: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'User ID.',
                        },
                        identityId: {
                          type: 'string',
                          description: 'User identity ID.',
                        },
                      },
                    },
                    createdAt: {
                      type: 'string',
                      description: 'Date when the message was created.',
                    },
                    isEditable: {
                      type: 'boolean',
                      description: 'Flag to indicate if the message can be edited.',
                    },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: 'Bad request.',
      },
      401: {
        description: 'Unauthorized.',
      },
      403: {
        description: 'Forbidden.',
      },
      404: {
        description: 'Not found.',
      },
      500: {
        description: 'Internal server error.',
      },
    },
  },
});

