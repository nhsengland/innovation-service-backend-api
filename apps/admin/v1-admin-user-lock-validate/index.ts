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

class V1AdminUserLockValidate {
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

      const result = await usersService.validateLockUser(params.userId);

      context.res = ResponseHelper.Ok<ResponseDTO>({ validations: result });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1AdminUserLockValidate.httpTrigger as AzureFunction,
  '/v1/users/{userId}/lock/validate',
  {
    post: {
      description: 'Get validation information when locking a user.',
      operationId: 'v1-admin-user-lock-validate',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  validations: {
                    type: 'object',
                    description: 'Validation data.',
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
          description: 'The user is not authorized to access validation data.',
        },
        '500': {
          description: 'An error occurred while fetching the validation data.',
        },
      },
    },
  }
);
