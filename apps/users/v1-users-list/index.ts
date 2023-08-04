import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ServiceRoleEnum } from '@users/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService, DomainService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { UsersService } from '../_services/users.service';
import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1UsersList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
    const usersService = container.get<UsersService>(SYMBOLS.UsersService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      if ('email' in queryParams) {
        await authorizationService.validate(context).checkAdminType().verify();

        // Due to the limitations of our identity service that only allows to search by one email at a time,
        // this functions returns always a list to mimic a future search feature.
        const result = await domainService.users.getUserByEmail(queryParams.email, {
          userRoles: queryParams.userTypes
        });
        context.res = ResponseHelper.Ok<ResponseDTO>(
          result.map(item => ({
            id: item.id,
            name: item.displayName,
            email: item.email,
            roles: item.roles,
            isActive: item.isActive,
            ...(item.lockedAt && { lockedAt: item.lockedAt }),
            ...(item.organisations && {
              organisations: item.organisations.map(o => ({
                id: o.id,
                name: o.name,
                acronym: o.acronym ?? '',
                role: o.role,
                ...(o.organisationUnits && {
                  units: o.organisationUnits.map(u => ({
                    id: u.id,
                    name: u.name,
                    acronym: u.acronym
                  }))
                })
              }))
            })
          }))
        );
        return;
      } else if ('userTypes' in queryParams) {
        const { skip, take, order } = queryParams;

        const validation = authorizationService.validate(context).checkAdminType();

        //only admins can get user emails
        if (!queryParams.fields.includes('email')) {
          // all users need to be able to list NA users for message transparency page
          if (queryParams.userTypes.length === 1 && queryParams.userTypes[0] === ServiceRoleEnum.ASSESSMENT) {
            validation.checkAssessmentType();
            validation.checkAccessorType();
            validation.checkInnovatorType();
          }

          if (queryParams.organisationUnitId) {
            validation.checkAccessorType({
              organisationRole: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
              organisationUnitId: queryParams.organisationUnitId
            });
          }
        }

        await validation.verify();

        const users = await usersService.getUserList(queryParams, queryParams.fields, {
          skip,
          take,
          order
        });

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
    parameters: [], // TODO: Add query params. Swagger helper doesn't support Joi.alternatives()
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for user object' }
              }
            }
          }
        }
      }
    }
  }
});
