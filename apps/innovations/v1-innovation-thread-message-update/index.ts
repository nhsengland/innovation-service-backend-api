import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationStatusEnum } from '@innovations/shared/enums';
import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
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
        .checkNotArchived()
        .checkInnovation({
          status: {
            ACCESSOR: [InnovationStatusEnum.IN_PROGRESS],
            QUALIFYING_ACCESSOR: [InnovationStatusEnum.IN_PROGRESS]
          }
        })
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
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema),
      responses: {
        '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Success'
        }),
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
