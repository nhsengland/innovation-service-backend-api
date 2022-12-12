import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation';


class V1Health {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<any> {

    try {
      const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
      await authorizationService.validate(context.auth.user.identityId).checkAdminType().verify();
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
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['OK', 'WARN'] }
              },
            }
          }
        }
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
    }
  }
});
