import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { container } from '../_config';

import { JwtDecoder } from '@admin/shared/decorators';
import { ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { CustomContextType } from '@admin/shared/types';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUserInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await usersService.getUserInfo(params.userIdOrEmail);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminUserInfo.httpTrigger as AzureFunction, '/v1/users/{userIdOrEmail}', {
  get: {
    operationId: 'v1-admin-user-info',
    description: 'Get user info.',
    tags: ['[v1] Admin Users'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                name: { type: 'string' },
                phone: { type: 'string' },
                isActive: { type: 'boolean' },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      role: { type: 'string', enum: Object.values(ServiceRoleEnum) },
                      displayTeam: { type: 'string' },
                      isActive: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      400: { description: 'The request is invalid.' },
      401: { description: 'The user is not authenticated.' },
      403: { description: 'The user is not authorized to access this resource.' },
      500: { description: 'An error occurred while processing the request.' }
    }
  }
});
