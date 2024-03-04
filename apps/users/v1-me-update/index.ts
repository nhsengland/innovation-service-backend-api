import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ServiceRoleEnum } from '@users/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import {
  DefaultUserBodySchema,
  DefaultUserBodyType,
  InnovatorBodySchema,
  InnovatorBodyType
} from './validation.schemas';

class V1MeUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const authInstance = await authorizationService.validate(context).verify();
      const requestUser = authInstance.getUserInfo();
      const domainContext = authInstance.getContext();

      if (
        [
          ServiceRoleEnum.ADMIN,
          ServiceRoleEnum.ASSESSMENT,
          ServiceRoleEnum.ACCESSOR,
          ServiceRoleEnum.QUALIFYING_ACCESSOR
        ].includes(domainContext.currentRole.role)
      ) {
        const accessorBody = JoiHelper.Validate<DefaultUserBodyType>(DefaultUserBodySchema, request.body);

        await authInstance.checkAdminType().checkAssessmentType().checkAccessorType().verify();

        const accessorResult = await usersService.updateUserInfo(
          { id: requestUser.id, identityId: requestUser.identityId },
          domainContext.currentRole.role,
          { displayName: accessorBody.displayName }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: accessorResult.id });
        return;
      } else if (domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
        const innovatorBody = JoiHelper.Validate<InnovatorBodyType>(InnovatorBodySchema, request.body);

        await authInstance.checkInnovatorType({ organisationId: innovatorBody.organisation.id }).verify();

        const innovatorResult = await usersService.updateUserInfo(
          {
            id: requestUser.id,
            identityId: requestUser.identityId,
            firstTimeSignInAt: requestUser.firstTimeSignInAt
          },
          domainContext.currentRole.role,
          {
            displayName: innovatorBody.displayName,
            contactByEmail: innovatorBody.contactByEmail,
            contactByPhone: innovatorBody.contactByPhone,
            contactByPhoneTimeframe: innovatorBody.contactByPhoneTimeframe,
            contactDetails: innovatorBody.contactDetails,
            ...(innovatorBody.mobilePhone !== undefined ? { mobilePhone: innovatorBody.mobilePhone } : {}),
            organisation: innovatorBody.organisation,
            howDidYouFindUsAnswers: innovatorBody.howDidYouFindUsAnswers
          }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: innovatorResult.id });
        return;
        /* c8 ignore next 3 */
      } else {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
      }
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeUpdate.httpTrigger as AzureFunction, '/v1/me', {
  put: {
    description: 'User profile information update',
    operationId: 'v1-me-update',
    tags: ['[v1] Users'],
    parameters: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                description: 'The display name of the user',
                example: 'John Doe'
              },
              mobilePhone: {
                type: 'string',
                description: 'The mobile phone number of the user',
                example: '07777777777'
              },
              organisation: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'The ID of the organisation',
                    example: '12345678-1234-1234-1234-123456789012'
                  },
                  name: {
                    type: 'string',
                    description: 'The name of the organisation',
                    example: 'Example Organisation'
                  },
                  isShadow: {
                    type: 'boolean',
                    description: 'Whether the organisation is a shadow organisation',
                    example: false
                  },
                  size: {
                    type: 'string',
                    description: 'The size of the organisation',
                    example: 'small'
                  }
                }
              }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'User information updated',
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
