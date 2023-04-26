import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import type { CustomContextType } from '@innovations/shared/types';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { container } from '../_config';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import {
  InnovationSupportsServiceSymbol,
  InnovationSupportsServiceType,
} from '../_services/interfaces';

class V1InnovationsSuggestionList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationSupportsService = container.get<InnovationSupportsServiceType>(
      InnovationSupportsServiceSymbol
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .verify();

      const result = await innovationSupportsService.getInnovationSuggestions(params.innovationId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsSuggestionList.httpTrigger as AzureFunction,
  '/v1/{innovationId}/suggestions',
  {
    get: {
      description: 'Get suggestions list of an Innovation',
      operationId: 'v1-innovation-suggestions',
      tags: ['Innovation Suggestions'],
      parameters: [
        {
          in: 'path',
          name: 'innovationId',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        200: {
          description: 'OK',
        },
        400: {
          description: 'Bad Request',
        },
        404: {
          description: 'Not Found',
        },
      },
    },
  }
);
