import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import {  ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';

class V1MeMfaInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const auth = await authorizationService.validate(context).checkInnovatorType().verify();

      const result = await usersService.getUserMfaInfo(auth.getContext());

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeMfaInfo.httpTrigger as AzureFunction, '/v1/me/mfa', {
  get: {
    description: 'Get user MFA configuration',
    operationId: 'v1-me-mfa-info',
    tags: ['[v1] Users'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['none', 'email', 'phone'] },
                phoneNumber: { type: 'string' },
              }
            }
          }
        }
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' },
      500: { description: 'Internal Server Error' }
    }
  }
});
