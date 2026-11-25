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

class V1InnovationThreadCreate {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    target: TargetEnum.THREAD,
    identifierResponseField: 'id'
  })
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

      const result = await threadsService.createEditableThread(domainContext, pathParams.innovationId, body, true);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.thread.id
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationThreadCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/threads', {
  post: {
    summary: 'Create a new editable thread',
    description: 'Create a new editable thread.',
    tags: ['Innovation Threads'],
    operationId: 'v1-innovation-thread-create',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The thread details.' }),
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The thread was created successfully.'
      }),
      '400': {
        description: 'The request was invalid.'
      },
      '401': {
        description: 'The user is not authenticated.'
      },
      '403': {
        description: 'The user is not authorized to create a thread.'
      },
      '404': {
        description: 'The innovation does not exist.'
      },
      '500': {
        description: 'An error occurred while creating the thread.'
      }
    }
  }
});
