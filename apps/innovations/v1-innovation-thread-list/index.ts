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
import { ParamsSchema, type ParamsType, QueryParamsSchema, type QueryParamsType } from './validation.schemas';

class V1InnovationThreadCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, {
        userType: domainContext.currentRole.role
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { skip, take, order, ...filters } = queryParams;

      const result = await threadsService.getThreadList(domainContext, params.innovationId, filters, queryParams);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(thread => ({
          id: thread.id,
          subject: thread.subject,
          createdBy: {
            id: thread.createdBy.id,
            displayTeam: thread.createdBy.displayTeam
          },
          lastMessage: {
            id: thread.lastMessage.id,
            createdAt: thread.lastMessage.createdAt,
            createdBy: {
              id: thread.lastMessage.createdBy.id,
              displayTeam: thread.lastMessage.createdBy.displayTeam
            }
          },
          hasUnreadNotifications: thread.hasUnreadNotifications,
          messageCount: thread.messageCount
        }))
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationThreadCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads', {
  get: {
    summary: 'Get Innovation Threads',
    description: 'Get Innovation Threads',
    tags: ['Innovation Threads'],
    operationId: 'v1-innovation-thread-list',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: QueryParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' },
      500: { description: 'Internal Server Error' }
    }
  }
});
