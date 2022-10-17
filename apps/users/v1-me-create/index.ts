import type { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import jwtDecode, { JwtPayload } from "jwt-decode";

import { BadRequestError, UserErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import { BodySchema, BodyType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1MeCreate {

  static async httpTrigger(context: Context, request: HttpRequest): Promise<void> {

    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      let identityId: string = '';

      try {

        const decodedToken = jwtDecode<JwtPayload>(body.token);

        if (decodedToken.sub) {
          identityId = decodedToken.sub;
        } else {
          throw new BadRequestError(UserErrorsEnum.REQUEST_USER_INVALID_TOKEN);
        }

      } catch (error) {
        throw new BadRequestError(UserErrorsEnum.REQUEST_USER_INVALID_TOKEN);
      }


      const result = await usersService.createUserInnovator({ identityId }, { surveyId: body.surveyId ?? null });

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }

  }

}


// TODO: update documentation.
export default openApi(V1MeCreate.httpTrigger as AzureFunction, '/v1/me', {
  post: {
    summary: 'Create a new user on DB',
    operationId: 'v1-me-create',
    tags: ['v1'],
    responses: {
      200: {
        description: 'User created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },

            },
          },
        },
      },
      400: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    }

  }
});