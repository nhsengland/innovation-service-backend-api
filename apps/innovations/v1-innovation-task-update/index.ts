import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@innovations/shared/errors';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTasksService } from '../_services/innovation-tasks.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationTaskUpdate {
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
        .checkInnovation({
          status: {
            ACCESSOR: [InnovationStatusEnum.IN_PROGRESS],
            QUALIFYING_ACCESSOR: [InnovationStatusEnum.IN_PROGRESS]
          }
        })
        .verify();
      const domainContext = auth.getContext();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body, {
        userRole: domainContext.currentRole.role
      });

      if (
        domainContext.currentRole.role === ServiceRoleEnum.ACCESSOR ||
        domainContext.currentRole.role === ServiceRoleEnum.QUALIFYING_ACCESSOR
      ) {
        const accessorResult = await innovationTasksService.updateTaskAsAccessor(
          domainContext,
          params.innovationId,
          params.taskId,
          { status: body.status, message: body.message }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: accessorResult.id });
        return;
      }

      if (domainContext.currentRole.role === ServiceRoleEnum.ASSESSMENT) {
        const assessmentResult = await innovationTasksService.updateTaskAsNeedsAccessor(
          domainContext,
          params.innovationId,
          params.taskId,
          { status: body.status, message: body.message }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: assessmentResult.id });
        return;
      }

      if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
        const innovatorResult = await innovationTasksService.updateTaskAsInnovator(
          domainContext,
          params.innovationId,
          params.taskId,
          { status: body.status, message: body.message ?? '' } // joi validates message is required
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: innovatorResult.id });
        return;
      }
      /* c8 ignore next 2 */
      // This will never happen since validation ensures it's one of these roles. code coverage is not aware of this.
      throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTaskUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/tasks/{taskId}', {
  put: {
    description: 'Update an innovation task.',
    operationId: 'v1-innovation-task-update',
    tags: ['[v1] Innovation Tasks'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The innovation task data.' }),
    responses: {
      '200': {
        description: 'The innovation task has been updated.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The innovation task id.'
                },
                name: {
                  type: 'string',
                  description: 'The name of the task.'
                },
                description: {
                  type: 'string',
                  description: 'The description of the task.'
                },
                status: {
                  type: 'string',
                  description: 'The status of the task.'
                },
                assignee: {
                  type: 'string',
                  description: 'The assignee of the task.'
                },
                dueDate: {
                  type: 'string',
                  description: 'The due date of the task.'
                },
                comment: {
                  type: 'string',
                  description: 'The comment of the task.'
                },
                createdAt: {
                  type: 'string',
                  description: 'The date when the task was created.'
                },
                updatedAt: {
                  type: 'string',
                  description: 'The date when the task was updated.'
                }
              }
            }
          }
        }
      },
      '400': {
        description: 'The innovation task data is invalid.'
      },
      '401': {
        description: 'The user is not authorized to update the innovation task.'
      },
      '404': {
        description: 'The innovation task does not exist.'
      },
      '500': {
        description: 'An error occurred while updating the innovation task.'
      }
    }
  }
});
