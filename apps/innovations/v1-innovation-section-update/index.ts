import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container, INNOVATION_SECTIONS_CONFIG } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class GetInnovationSectionInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const key = params.sectionKey as keyof typeof INNOVATION_SECTIONS_CONFIG;
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
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(GetInnovationSectionInfo.httpTrigger as AzureFunction, 'v1/{innovationId}/sections/{sectionKey}/info', {
  put: {
    description: 'Update an innovation section info.',
    tags: ['Innovation'],
    summary: 'Update an innovation section info.',
    operationId: 'updateInnovationSectionInfo',
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