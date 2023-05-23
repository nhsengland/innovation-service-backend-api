import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import jwtDecode, { JwtPayload } from 'jwt-decode';

import { BadRequestError, UserErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';

import { container } from '../_config';

import type { CustomContextType } from '@users/shared/types';
import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1MeCreate {
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      if (!body.identityId) {
        // If identityId not supplied, try go get it from the token.

        try {
          const decodedToken = jwtDecode<JwtPayload>(body.token ?? '');

          if (decodedToken.sub) {
            body.identityId = decodedToken.sub;
          } else {
            throw new BadRequestError(UserErrorsEnum.REQUEST_USER_INVALID_TOKEN);
          }
        } catch (error) {
          throw new BadRequestError(UserErrorsEnum.REQUEST_USER_INVALID_TOKEN);
        }
      }

      const result = await usersService.createUserInnovator({ identityId: body.identityId });

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

// TODO: update documentation.
export default openApi(V1MeCreate.httpTrigger as AzureFunction, '/v1/me', {
  post: {
    summary: 'Create a new user on DB',
    operationId: 'v1-me-create',
    tags: ['[v1] Users'],
    responses: {
      200: {
        description: 'User created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
});
