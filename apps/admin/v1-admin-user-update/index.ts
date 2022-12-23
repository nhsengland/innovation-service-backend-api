import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import { SLSEventTypeEnum, SLSQueryParam, SLSQuerySchema } from '@admin/shared/schemas/sls.schema';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1AdminUserUpdate {
  @JwtDecoder()
  static async httpTrigger(
    context: CustomContextType,
    request: HttpRequest
  ): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {
      const params = JoiHelper.Validate<ParamsType>(
        ParamsSchema,
        request.params
      );
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService
        .validate(context.auth.user.identityId)
        .checkAdminType()
        .verify();

      const sls = JoiHelper.Validate<SLSQueryParam>(SLSQuerySchema, request.query);
      await authorizationService.validateSLS(context.auth.user.identityId, SLSEventTypeEnum.ADMIN_UPDATE_USER, sls.id, sls.code);
      
      await usersService.updateUser(params.userId, body);

      context.res = ResponseHelper.Ok<ResponseDTO>({ userId: params.userId});
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUserUpdate.httpTrigger as AzureFunction,
  '/v1/users/{userId}',
  {
    patch: {
      description: 'Update a user.',
      operationId: 'v1-admin-user-update',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: SLSQuerySchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema),
      responses: {
        '200': {
          description: 'The user has been updated.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'Id of the user.',
                  }
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request.',
        },
        '401': {
          description: 'The user is not authorized to lock a user.',
        },
        '404': {
          description: 'The user does not exist.',
        },
        '500': {
          description: 'An error occurred while locking a user.',
        },
      },
    },
  }
);
