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
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1AdminUserStrategicRolesCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const userId = request.params['userId']!;
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const domainContext = auth.getContext();

      const result = await usersService.createStrategicRoles(domainContext, userId, body);

      context.res = ResponseHelper.Created<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUserStrategicRolesCreate.httpTrigger as AzureFunction,
  '/v1/users/{userId}/strategic-roles',
  {
    post: {
      description: 'Create strategic roles for a user.',
      operationId: 'v1-admin-user-strategic-roles-create',
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'The user id.'
        }
      ],
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The strategic roles to be assigned.' }),
      responses: {
        '201': SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'The strategic roles have been created.'
        }),
        '400': { description: 'Bad request.' },
        '401': { description: 'The user is not authorized.' },
        '500': { description: 'An error occurred.' }
      }
    }
  }
);
