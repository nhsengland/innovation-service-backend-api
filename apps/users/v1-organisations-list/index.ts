import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { OrganisationsServiceSymbol, OrganisationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1OrganisationsList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const organisationsService = container.get<OrganisationsServiceType>(OrganisationsServiceSymbol);

    try {

      const auth = await authService.validate(context)
        .checkAdminType()
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .verify();
      const requestUser = auth.getUserInfo();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, { userType: requestUser.type });

      const result = await organisationsService.getOrganisationsList(queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>(result.map(item => ({
        id: item.id,
        name: item.name,
        acronym: item.acronym,
        ...(item.organisationUnits === undefined ? {} : { organisationUnits: item.organisationUnits }),
      })));
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
      200: {
        description: 'Ok',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          }
        }
      },
    },
  },
});
