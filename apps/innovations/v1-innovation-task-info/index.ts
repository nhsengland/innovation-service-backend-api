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
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationTaskInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTasksService = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovatorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await innovationTasksService.getTaskInfo(params.taskId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        displayId: result.displayId,
        status: result.status,
        description: result.description,
        section: result.section,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        updatedBy: {
          name: result.updatedBy.name,
          role: result.updatedBy.role,
          ...(result.updatedBy.isOwner !== undefined && { isOwner: result.updatedBy.isOwner })
        },
        createdBy: { ...result.createdBy },
        ...(result.declineReason ? { declineReason: result.declineReason } : {})
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
      200: {
        description: 'The innovation task.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid'
                },
                displayId: {
                  type: 'string'
                },
                status: {
                  type: 'string',
                  enum: ['OPEN', 'DONE', 'CANCELED', 'DECLINED']
                },
                description: {
                  type: 'string'
                },
                section: {
                  type: 'string'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                createdBy: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    organisationUnit: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      },
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
