import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { AccessorOrganisationRoleEnum } from '@users/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1UsersList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      if ('email' in queryParams) {

        await authorizationService.validate(context.auth.user.identityId)
          .checkAdminType()
          .verify();

        // Due to the limitations of our identity service that only allows to search by one email at a time,
        // this functions returns always a list to mimic a future search feature.
        const result = await usersService.getUserByEmail(queryParams.email, { userTypes: queryParams.userTypes || [] });
        context.res = ResponseHelper.Ok<ResponseDTO>(result.map(item => ({
          id: item.id,
          name: item.displayName,
          email: item.email,
          type: item.type,
          isActive: item.isActive,
        })));
        return;

      } else if ('userTypes' in queryParams) {
        
        const validation = authorizationService.validate(context.auth.user.identityId)
          .checkAdminType();
        if(queryParams.organisationUnitId) {
          validation.checkAccessorType({
            organisationRole: [AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR],
            organisationUnitId: queryParams.organisationUnitId
          });
        }
        await validation.verify()

        const users = await usersService.getUserList(queryParams, queryParams.fields);
        context.res = ResponseHelper.Ok<ResponseDTO>(users);
        return;

      } else {
        // this should be handled by joi but didn't manage to get it working so this is a fallback
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);
      }

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

// TODO this needs to be improved
export default openApi(V1UsersList.httpTrigger as AzureFunction, '/v1', {
  get: {
    operationId: 'v1-users-list',
    description: 'Get users list',
    tags: ['[v1] Users'],
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for user object' },
              }
            }
          }
        }
      }
    }
  }
});
