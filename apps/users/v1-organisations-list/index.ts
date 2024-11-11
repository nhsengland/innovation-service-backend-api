import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ServiceRoleEnum } from '@users/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';

import type { OrganisationsService } from '../_services/organisations.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1OrganisationsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const organisationsService = container.get<OrganisationsService>(SYMBOLS.OrganisationsService);

    try {
      const auth = await authService
        .validate(context)
        .checkAdminType()
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .verify();

      const domainContext = auth.getContext();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, {
        userType: domainContext.currentRole.role
      });

      const result = await organisationsService.getOrganisationsList(queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>(
        result.map(item => ({
          id: item.id,
          name: item.name,
          acronym: item.acronym,
          ...(domainContext.currentRole.role === ServiceRoleEnum.ADMIN && {
            isActive: item.isActive
          }), // admin only
          ...(item.organisationUnits && {
            organisationUnits: item.organisationUnits
              .map(ou => ({
                id: ou.id,
                name: ou.name,
                acronym: ou.acronym,
                ...(domainContext.currentRole.role === ServiceRoleEnum.ADMIN && {
                  isActive: ou.isActive
                }) // admin only
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          })
        }))
      );
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1OrganisationsList.httpTrigger as AzureFunction, '/v1/organisations', {
  get: {
    description: 'Retrieves organisations list',
    operationId: 'v1-organisations-list',
    tags: ['[v1] Organisations'],
    parameters: [],
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Ok'
      })
    }
  }
});
