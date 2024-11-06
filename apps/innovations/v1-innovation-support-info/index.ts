import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';

class V1InnovationSupportInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).setInnovation(params.innovationId).checkAccessorType().verify();

      const result = await innovationSupportsService.getInnovationSupportInfo(params.supportId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        status: result.status,
        engagingAccessors: result.engagingAccessors
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSupportInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/supports/{supportId}',
  {
    get: {
      description: 'Get supporting information for an Innovation',
      operationId: 'v1-innovation-support-info',
      tags: ['[v1] Innovation Support'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'OK'
        }),
        400: {
          description: 'Bad Request'
        },
        404: {
          description: 'Not Found'
        }
      }
    }
  }
);
