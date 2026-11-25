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
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationTaskInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTasksService = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovatorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationTasksService.getTaskInfo(domainContext, params.taskId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        displayId: result.displayId,
        status: result.status,
        descriptions: result.descriptions,
        section: result.section,
        threadId: result.threadId,
        sameOrganisation: result.sameOrganisation,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        updatedBy: {
          name: result.updatedBy.name,
          displayTag: result.updatedBy.displayTag
        },
        createdBy: {
          name: result.createdBy.name,
          displayTag: result.createdBy.displayTag
        },
        assignedTo: {
          name: result.assignedTo.name,
          displayTag: result.assignedTo.displayTag
        }
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTaskInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/tasks/{taskId}', {
  get: {
    description: 'Get an innovation task.',
    operationId: 'v1-innovation-task-info',
    tags: ['[v1] Innovation Tasks'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The innovation task.'
      }),
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      404: {
        description: 'Not Found'
      }
    }
  }
});
