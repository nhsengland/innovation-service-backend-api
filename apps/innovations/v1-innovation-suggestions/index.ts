import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationsSuggestionList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkInnovation()
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

export default openApi(V1InnovationsSuggestionList.httpTrigger as AzureFunction, '/v1/{innovationId}/suggestions', {
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
          type: 'string'
        }
      }
    ],
    responses: {
      200: {
        description: 'OK'
      },
      400: {
        description: 'Bad Request'
      },
      404: {
        description: 'Not Found'
      }
    }
  }
});
