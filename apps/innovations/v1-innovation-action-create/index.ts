import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import {
    AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationActionServiceSymbol, InnovationActionServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';


class V1CreateInnovationAction {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationActionService = container.get<InnovationActionServiceType>(InnovationActionServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .checkAccessorType()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationActionService.createInnovationAction(
        requestUser,
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

export default openApi(V1CreateInnovationAction.httpTrigger as AzureFunction, '/v1/{innovationId}/actions', {
  post: {
    description: 'Create a new innovation action.',
    operationId: 'v1-innovation-action-create',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'The innovation id.',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
    ],
    requestBody: {
      description: 'The innovation action to create.',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'The description of the action.',
                example: 'This is a description of the action.',
              },
              sectionKey: {
                type: 'string',
                description: 'The section key.',
                example: 'ACCESS',
              },
            },
            required: ['description', 'sectionKey'],
          },
        },
      },
    },
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