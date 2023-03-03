import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationCollaboratorsServiceSymbol, InnovationCollaboratorsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationCollaboratorInviteUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsServiceType>(InnovationCollaboratorsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationCollaboratorsService.updateCollaboratorInviteStatus(
        domainContext,
        params.innovationId,
        body
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationCollaboratorInviteUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/collaborators/respond', {
  post: {
    description: 'Updates collaboration invite as the invited collaborator.',
    operationId: 'v1-innovation-collaborator-invite-update',
    tags: ['[v1] Innovation Collaborators'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The status to update collaborator invite.' }),
    responses: {
      200: {
        description: 'The collaborator has been updated.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The collaborator id.',
                  example: 'c0a80121-7ac0-464e-b8f6-27b88b0cda7f',
                },
              },
              required: ['id'],
            },
          },
        },
      },
      400: {
        description: 'The collaborator invite could not be updated.',
      },
      401: {
        description: 'The user is not authorized to update an collaborator.',
      },
      403: {
        description: 'The user is not allowed to update an collaborator.',
      },
      404: {
        description: 'The innovation could not be found.',
      },
      500: {
        description: 'An unexpected error occurred while updating the collaborator.',
      },
    },
  },
});
