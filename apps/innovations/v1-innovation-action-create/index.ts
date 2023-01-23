import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationActionCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationActionsService = container.get<InnovationActionsServiceType>(InnovationActionsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovation()
        .verify();
        
      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await innovationActionsService.createAction(
        { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
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

export default openApi(V1InnovationActionCreate.httpTrigger as AzureFunction, '/v1/{innovationId}/actions', {
  post: {
    description: 'Create a new innovation action.',
    operationId: 'v1-innovation-action-create',
    tags: ['[v1] Innovation Actions'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The innovation action to create.' }),
    responses: {
      200: {
        description: 'The innovation action has been created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The innovation action id.',
                  example: 'c0a80121-7ac0-464e-b8f6-27b88b0cda7f',
                },
              },
              required: ['id'],
            },
          },
        },
      },
      400: {
        description: 'The innovation action could not be created.',
      },
      401: {
        description: 'The user is not authorized to create an innovation action.',
      },
      403: {
        description: 'The user is not allowed to create an innovation action.',
      },
      404: {
        description: 'The innovation could not be found.',
      },
      500: {
        description: 'An unexpected error occurred while creating the innovation action.',
      },
    },
  },
});
