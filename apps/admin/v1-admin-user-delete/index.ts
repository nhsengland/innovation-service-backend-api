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
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUserDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const pathParam = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const domainContext = auth.getContext();

      await usersService.deleteUser(domainContext, pathParam.userId);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminUserDelete.httpTrigger as AzureFunction, '/v1/users/{userId}', {
  delete: {
    description: 'delete a user.',
    operationId: 'v1-admin-user-delete',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      '204': {
        description: 'The user has been deleted.'
      },
      '400': { description: 'Bad request.' },
      '403': { description: 'The user is not authorized to delete a user.' },
      '500': { description: 'An error occurred while deleting the user.' }
    }
  }
});
