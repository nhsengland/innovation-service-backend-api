import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';
import { ResponseBodySchema } from './transformation.dtos';

class V1AdminUserRolesCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      await usersService.updateUserRole(auth.getContext(), params.userId, params.roleId, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminUserRolesCreate.httpTrigger as AzureFunction, '/v1/users/{userId}/roles/{roleId}', {
  patch: {
    description: 'Update user role.',
    operationId: 'v1-admin-user-role-update',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      204: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Updated the user role'
      }),
      400: { description: 'The request is invalid.' },
      401: { description: 'The user is not authenticated.' },
      403: { description: 'The user is not authorized to access this resource.' },
      500: { description: 'An error occurred while processing the request.' }
    }
  }
});
