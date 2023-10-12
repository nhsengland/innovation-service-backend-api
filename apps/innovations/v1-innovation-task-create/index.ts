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
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationTaskCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTasksService = container.get<InnovationTasksService>(SYMBOLS.InnovationTasksService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationTasksService.createTask(domainContext, params.innovationId, body);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTaskCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/tasks', {
  post: {
    description: 'Create a new innovation task.',
    operationId: 'v1-innovation-task-create',
    tags: ['[v1] Innovation Tasks'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The innovation task to create.'
    }),
    responses: {
      200: {
        description: 'The innovation task has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The innovation task id.',
                  example: 'c0a80121-7ac0-464e-b8f6-27b88b0cda7f'
                }
              },
              required: ['id']
            }
          }
        }
      },
      400: {
        description: 'The innovation task could not be created.'
      },
      401: {
        description: 'The user is not authorized to create an innovation task.'
      },
      403: {
        description: 'The user is not allowed to create an innovation task.'
      },
      404: {
        description: 'The innovation could not be found.'
      },
      500: {
        description: 'An unexpected error occurred while creating the innovation task.'
      }
    }
  }
});
