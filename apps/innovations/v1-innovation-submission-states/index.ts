import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationSubmissionStates {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.READ,
    target: TargetEnum.INNOVATION,
    identifierParam: 'innovationId'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).setInnovation(params.innovationId).checkInnovation().verify();

      const result = await innovationsService.getInnovationSubmissionsState(params.innovationId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        submittedAllSections: result.submittedAllSections,
        submittedForNeedsAssessment: result.submittedForNeedsAssessment
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationSubmissionStates.httpTrigger as AzureFunction, '/v1/{innovationId}/submissions', {
  get: {
    operationId: 'v1-innovation-submission-states',
    description: 'Get innovation submission states.',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'Innovation ID',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid innovation payload' }
    }
  }
});
