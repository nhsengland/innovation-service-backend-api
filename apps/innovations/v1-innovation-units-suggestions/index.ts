import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import type { ResponseDTO } from './transformation.dtos';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { ParamsSchema, ParamsType } from './validation.schemas';
import SYMBOLS from '../_services/symbols';

class V1GetInnovationQASuggestions {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovation()
        .verify();

      const result = await innovationSupportsService.getInnovationUnitsSuggestions(
        auth.getContext(),
        params.innovationId
      );

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1GetInnovationQASuggestions.httpTrigger as AzureFunction,
  '/v1/{innovationId}/units-suggestions',
  {
    get: {
      description: 'Get suggestions made by other units to the innovation',
      operationId: 'v1-innovation-units-suggestions',
      tags: ['Innovation Suggestions'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'OK'
        },
        400: {
          description: 'Bad Request'
        },
        404: {
          description: 'Not found'
        }
      }
    }
  }
);
