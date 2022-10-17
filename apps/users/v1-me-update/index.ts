import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@users/shared/decorators';
import { UserTypeEnum } from '@users/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { AccessorBodySchema, AccessorBodyType, InnovatorBodySchema, InnovatorBodyType } from './validation.schemas';


class PutMe {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId).verify();
      const requestUser = authInstance.getUserInfo();

      if (requestUser.type === UserTypeEnum.ACCESSOR) {
        const accessorBody = JoiHelper.Validate<AccessorBodyType>(AccessorBodySchema, request.body);
        authInstance
          .checkAccessorType()
          .verify();

        const accessorResult = await usersService.updateUserInfo(
          { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
          { displayName: accessorBody.displayName }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: accessorResult.id });
        return;

      } else if (requestUser.type === UserTypeEnum.INNOVATOR) {

        const innovatorBody = JoiHelper.Validate<InnovatorBodyType>(InnovatorBodySchema, request.body);

        await authInstance
          .checkInnovatorType({ organisationId: innovatorBody.organisation.id })
          .verify();

        const innovatorResult = await usersService.updateUserInfo(
          { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type, firstTimeSignInAt: requestUser.firstTimeSignInAt },
          {
            displayName: innovatorBody.displayName,
            ...(innovatorBody.mobilePhone ? { mobilePhone: innovatorBody.mobilePhone } : {}),
            organisation: innovatorBody.organisation
          }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: innovatorResult.id });
        return;

      } else {

        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);

      }

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }
  }
}

export default openApi(PutMe.httpTrigger as AzureFunction, '/v1/me', {
  put: {
    summary: 'Update user information',
    description: 'Update user information',
    operationId: 'v1-me-update',
    tags: ['v1'],
    parameters: [],
    requestBody: {
      description: 'Update user information',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                description: 'The display name of the user',
                example: 'John Doe',
              },
              mobilePhone: {
                type: 'string',
                description: 'The mobile phone number of the user',
                example: '07777777777',
              },
              organisation: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The ID of the organisation',
                    example: '12345678-1234-1234-1234-123456789012',
                  },
                  name: {
                    type: 'string',
                    description: 'The name of the organisation',
                    example: 'Example Organisation',
                  },
                  isShadow: {
                    type: 'boolean',
                    description: 'Whether the organisation is a shadow organisation',
                    example: false,
                  },
                  size: {
                    type: 'string',
                    description: 'The size of the organisation',
                    example: 'small',
                  },
                },
              }
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'User information updated',
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