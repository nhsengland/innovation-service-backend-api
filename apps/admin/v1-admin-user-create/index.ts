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

import { BodySchema, BodyType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { SLSEventTypeEnum, SLSQueryParam, SLSQuerySchema } from '@admin/shared/schemas/sls.schema';

class V1AdminUserCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );

    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);
    
    try {

        const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

        const auth = await authorizationService
            .validate(context.auth.user.identityId)
            .checkAdminType()
            .verify();

        const requestUser = auth.getUserInfo()

        const sls = JoiHelper.Validate<SLSQueryParam>(SLSQuerySchema, request.query);
        await authorizationService.validateSLS(context.auth.user.identityId, SLSEventTypeEnum.ADMIN_CREATE_USER, sls.id, sls.code);

        const result = await usersService.createUser(requestUser, body);

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
        return;
    } catch (error) {
        context.res = ResponseHelper.Error(context, error);
        return;
    }
  }
}

export default openApi(
  V1AdminUserCreate.httpTrigger as AzureFunction,
  '/v1/users',
  {
    post: {
      description: 'Create a user.',
      operationId: 'v1-admin-user-create',
      parameters: [],
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The user to be created.' }),
      responses: {
        '200': {
          description: 'The user has been created.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unitId: {
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
          description: 'The user is not authorized to create a user.',
        },
        '500': {
          description: 'An error occurred while creating the user.',
        },
      },
    },
  }
);
