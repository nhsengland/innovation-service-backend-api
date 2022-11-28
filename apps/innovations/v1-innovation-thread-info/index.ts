import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';


class V1InnovationThreadInfo {

  @JwtDecoder()
  @Audit({action: ActionEnum.READ, target: TargetEnum.THREAD, identifierParam: 'threadId'})
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

      const result = await threadsService.getThreadInfo(
        pathParams.threadId,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        subject: result.subject,
        createdAt: result.createdAt,
        createdBy: {
          id: result.createdBy.id,
          name: result.createdBy.name,
          type: result.createdBy.type,
        }
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationThreadInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/threads/{threadId}', {
  get: {
    summary: 'Get Innovation Thread Info',
    description: 'Get Innovation Thread Info',
    tags: ['Innovation Thread'],
    operationId: 'v1-innovation-thread-info',
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
                },
                subject: {
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