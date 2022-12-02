import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container, INNOVATION_SECTIONS_CONFIG } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class V1InnovationSectionUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const key = params.sectionKey;
      const body = JoiHelper.Validate<{ [key: string]: any }>(INNOVATION_SECTIONS_CONFIG[key].validation, request.body);

      const authInstance = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const requestUser = authInstance.getUserInfo();

      const result = await innovationSectionsService.updateInnovationSectionInfo({ id: requestUser.id }, params.innovationId, params.sectionKey, body);
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result?.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationSectionUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/sections/{sectionKey}', {
  put: {
    description: 'Update an innovation section info.',
    tags: ['Innovation'],
    summary: 'Update an innovation section info.',
    operationId: 'v1-innovation-section-update',
    parameters: [],
    requestBody: {
      description: 'Innovation section info update request body.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Innovation section info updated successfully.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      },
      400: {
        description: 'Bad request.',
      },
      401: {
        description: 'Unauthorized.',
      },
      403: {
        description: 'Forbidden.',
      },
      404: {
        description: 'Not found.',
      },
      500: {
        description: 'Internal server error.',
      },
    },
  },
});
