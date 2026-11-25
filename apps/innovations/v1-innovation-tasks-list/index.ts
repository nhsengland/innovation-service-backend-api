import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTasksService } from '../_services/innovation-tasks.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationTasksList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTasksService = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const auth = await authorizationService
        .validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      const result = await innovationTasksService.getTasksList(auth.getContext(), filters, {
        skip,
        take,
        order
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(item => ({
          id: item.id,
          displayId: item.displayId,
          status: item.status,
          innovation: { id: item.innovation.id, name: item.innovation.name },
          section: item.section,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          updatedBy: { name: item.updatedBy.name, displayTag: item.updatedBy.displayTag },
          createdBy: { name: item.createdBy.name, displayTag: item.createdBy.displayTag },
          assignedTo: { name: item.assignedTo.name, displayTag: item.assignedTo.displayTag },
          sameOrganisation: item.sameOrganisation,
          ...(item.notifications && { notifications: item.notifications })
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTasksList.httpTrigger as AzureFunction, '/v1/tasks', {
  get: {
    description: 'Get a list of innovation tasks.',
    operationId: 'v1-innovation-tasks-list',
    tags: ['[v1] Innovation Tasks'],
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The list of innovation tasks.'
      }),
      400: {
        description: 'The request is invalid.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to access this resource.'
      },
      500: {
        description: 'An error occurred while processing the request.'
      }
    }
  }
});
