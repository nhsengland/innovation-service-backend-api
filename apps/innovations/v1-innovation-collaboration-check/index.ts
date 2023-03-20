import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';

import { container } from '../_config';
import { InnovationCollaboratorsServiceSymbol, InnovationCollaboratorsServiceType } from '../_services/interfaces';

import { ParamsSchema, ParamsType } from './validations.schema';


class V1InnovationCollaboratorCheck {

  static async httpTrigger(context: Context, request: HttpRequest): Promise<void> {

    const innovationCollaboratorsService = container.get<InnovationCollaboratorsServiceType>(InnovationCollaboratorsServiceSymbol);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const result = await innovationCollaboratorsService.collaboratorExists(params.collaboratorId);
      context.res = result ? ResponseHelper.NoContent() : ResponseHelper.NotFound();
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationCollaboratorCheck.httpTrigger as AzureFunction, '/v1/collaborators/{collaboratorId}/check', {
  head: {
    description: 'Check if collaborator exists',
    operationId: 'v1-innovation-collaboration-check',
    tags: ['[v1] Innovation Collaborators'],    
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      204: {
        description: 'Success',
      },
      404: {
        description: 'Not Found',
      }
    }
  }
});
