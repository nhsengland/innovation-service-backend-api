import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
} from '@admin/shared/services';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { ParamsSchema, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { SLSEventTypeEnum, SLSQueryParam, SLSQuerySchema } from '@admin/shared/schemas/sls.schema';

class V1AdminDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );

    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context.auth.user.identityId)
        .checkAdminType()
        .verify();

      const sls = JoiHelper.Validate<SLSQueryParam>(SLSQuerySchema, request.query);
      await authorizationService.validateSLS(context.auth.user.identityId, SLSEventTypeEnum.ADMIN_DELETE_ADMIN, sls.id, sls.code);

      const result = await usersService.deleteAdmin(params.userId);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminDelete.httpTrigger as AzureFunction,
  '/v1/users/{userId}/delete',
  {
    patch: {
      description: 'Delete an admin user.',
      operationId: 'v1-admin-delete',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'The admin account has been deleted.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The user id.',
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request.',
        },
        '401': {
          description: 'The user is not authorized to delete an admin account.',
        },
        '500': {
          description: 'An error occurred while deleting the admin account.',
        },
      },
    },
  }
);
