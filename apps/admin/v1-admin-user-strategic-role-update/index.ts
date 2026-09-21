import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';

class V1AdminUserStrategicRoleUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const userId = request.params['userId']!;
      const strategicRoleId = request.params['strategicRoleId']!;

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const domainContext = auth.getContext();

      await usersService.deleteStrategicRole(domainContext, userId, strategicRoleId);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminUserStrategicRoleUpdate.httpTrigger as AzureFunction, '/v1/users/{userId}/strategic-roles/{strategicRoleId}', {
  delete: {
    description: 'Delete a strategic role from a user.',
    operationId: 'v1-admin-user-strategic-role-update',
    parameters: [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The user id.'
      },
      {
        name: 'strategicRoleId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'The strategic role id.'
      }
    ],
    responses: {
      '204': { description: 'The strategic role has been deleted.' },
      '401': { description: 'The user is not authorized.' },
      '404': { description: 'The strategic role was not found.' },
      '500': { description: 'An error occurred.' }
    }
  }
});
