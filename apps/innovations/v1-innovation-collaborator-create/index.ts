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


class V1InnovationCollaboratorCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsServiceType>(InnovationCollaboratorsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationCollaboratorsService.createCollaborator(
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

export default openApi(V1InnovationCollaboratorCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/collaborators', {
  post: {
    description: 'Create (invites) a new collaborator for the innovations.',
    operationId: 'v1-innovation-collaborator-create',
    tags: ['[v1] Innovation Collaborators'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The collaborator to be invited.' }),
    responses: {
      200: {
        description: 'The collaborator has been created.',
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
        description: 'The collaborator could not be created.',
      },
      401: {
        description: 'The user is not authorized to create an collaborator.',
      },
      403: {
        description: 'The user is not allowed to create an collaborator.',
      },
      404: {
        description: 'The innovation could not be found.',
      },
      500: {
        description: 'An unexpected error occurred while creating the collaborator.',
      },
    },
  },
});
