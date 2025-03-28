import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationStatusEnum } from '@innovations/shared/enums';
import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationThreadMessageCreate {
  @JwtDecoder()
  @Audit({ action: ActionEnum.UPDATE, target: TargetEnum.THREAD, identifierParam: 'threadId' })
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
        .checkNotArchived()
        .checkInnovation({
          status: {
            ACCESSOR: [InnovationStatusEnum.IN_PROGRESS],
            QUALIFYING_ACCESSOR: [InnovationStatusEnum.IN_PROGRESS]
          }
        })
        .verify();

      const domainContext = auth.getContext();

      const result = await threadsService.createEditableMessage(domainContext, pathParams.threadId, body, true);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        threadMessage: {
          id: result.threadMessage.id,
          message: result.threadMessage.message,
          createdBy: {
            id: result.threadMessage.author.id,
            identityId: result.threadMessage.author.identityId
          },
          createdAt: result.threadMessage.createdAt,
          isEditable: result.threadMessage.isEditable
        }
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadMessageCreate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/messages',
  {
    post: {
      description: 'Creates a new message in a thread.',
      operationId: 'v1-innovation-thread-message-create',
      tags: ['[v1] Innovation Threads'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'Message to be created.' }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Message created.'
        }),
        400: {
          description: 'Bad request.'
        },
        401: {
          description: 'Unauthorized.'
        },
        403: {
          description: 'Forbidden.'
        },
        404: {
          description: 'Not found.'
        },
        500: {
          description: 'Internal server error.'
        }
      }
    }
  }
);
