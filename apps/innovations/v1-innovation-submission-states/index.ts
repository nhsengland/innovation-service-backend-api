import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';


class V1InnovationSubmissionStates {

  @JwtDecoder()
  @Audit({ action: ActionEnum.READ, target: TargetEnum.INNOVATION, identifierParam: 'innovationId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .verify();

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
      },
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid innovation payload' },
    },
  },
});
