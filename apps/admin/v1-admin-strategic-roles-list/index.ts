import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';

class V1AdminStrategicRolesList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      await authorizationService.validate(context).verify();

      const result = await usersService.getStrategicRolesList();

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminStrategicRolesList.httpTrigger as AzureFunction, '/v1/strategic-roles', {
  get: {
    description: 'List all users with strategic roles grouped by organisation unit.',
    operationId: 'v1-admin-strategic-roles-list',
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The list of strategic roles.'
      }),
      '401': { description: 'The user is not authorized.' },
      '500': { description: 'An error occurred.' }
    }
  }
});
