import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationThreadMessageList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(pathParams.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      let orderBy;

      // TODO change this to pagination schema
      if (queryParams.order) {
        orderBy = JSON.parse(queryParams.order);
      }

      const result = await threadsService.getThreadMessagesList(
        domainContext,
        pathParams.threadId,
        queryParams.skip,
        queryParams.take,
        orderBy
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        messages: result.messages.map(message => ({
          id: message.id,
          file: message.file,
          createdAt: message.createdAt,
          createdBy: {
            id: message.createdBy.id,
            name: message.createdBy.name,
            role: message.createdBy.role,
            ...(message.createdBy.isOwner !== undefined && { isOwner: message.createdBy.isOwner }),
            organisationUnit: {
              id: message.createdBy.organisationUnit?.id ?? '', // if the organisationUnit exists, then all props are ensured to exist
              name: message.createdBy.organisationUnit?.name ?? '',
              acronym: message.createdBy.organisationUnit?.acronym ?? ''
            },
            organisation: {
              id: message.createdBy.organisation?.id ?? '', // if the organisation exists, then all props are ensured to exist
              name: message.createdBy.organisation?.name ?? '',
              acronym: message.createdBy.organisation?.acronym ?? ''
            }
          },
          isEditable: message.isEditable,
          isNew: message.isNew,
          message: message.message,
          updatedAt: message.updatedAt
        }))
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadMessageList.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/messages',
  {
    get: {
      summary: 'Get a list of messages from a thread',
      description: 'Get a list of messages from a thread',
      operationId: 'v1-innovation-thread-message-list',
      tags: ['[v1] Innovation Threads'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Returns a list of messages from a thread'
        }),
        400: {
          description: 'Bad request'
        },
        401: {
          description: 'Unauthorized'
        },
        403: {
          description: 'Forbidden'
        },
        404: {
          description: 'Not found'
        },
        500: {
          description: 'Internal server error'
        }
      }
    }
  }
);
