import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';

import { container } from '../_config';
import type { ResponseDTO } from './transformation.dtos';

import type { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import SYMBOLS from '../_services/symbols';
import { ParamsSchema, ParamsType } from './validations.schema';

class V1InnovationCollaboratorCheck {
  static async httpTrigger(context: Context, request: HttpRequest): Promise<void> {
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsService>(
      SYMBOLS.InnovationCollaboratorsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const result = await innovationCollaboratorsService.checkCollaborator(params.collaboratorId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        userExists: result.userExists,
        collaboratorStatus: result.collaboratorStatus,
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationCollaboratorCheck.httpTrigger as AzureFunction,
  '/v1/collaborators/{collaboratorId}/check',
  {
    get: {
      description: 'Check collaborator',
      operationId: 'v1-innovation-collaboration-check',
      tags: ['[v1] Innovation Collaborators'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userExists: { type: 'boolean', description: 'User exists in service' },
                  collaboratorStatus: {
                    type: 'string',
                    description: 'Status of the collaborator invite',
                  },
                },
              },
            },
          },
        },
        404: {
          description: 'Not Found',
        },
      },
    },
  }
);
