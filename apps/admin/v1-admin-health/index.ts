import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation';

class V1Health {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<any> {
    try {
      const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
      await authorizationService.validate(context).checkAdminType().verify();
      context.res = ResponseHelper.Ok<ResponseDTO>({
        status: 'OK'
      });
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
    }
  }
}

export default openApi(V1Health.httpTrigger as AzureFunction, '/v1/health', {
  get: {
    summary: 'Get admin health',
    description: 'Get admin application health status',
    tags: ['[v1] health'],
    parameters: [],
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      }
    }
  }
});
