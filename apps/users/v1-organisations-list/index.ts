import { mapOpenApi as openApi } from '@aaronpowell/azure-functions-nodejs-openapi/build/openAPIv2';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import {
  ResponseHelper, JoiHelper
} from '@users/shared/helpers';
import { JwtDecoder } from '@users/shared/decorators';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { OrganisationsServiceSymbol, OrganisationsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';


class GetOrganisations {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);

    await authService.validate(context.auth.user.identityId)
      .checkInnovatorType()
      .verify();


    const organisationsService = container.get<OrganisationsServiceType>(OrganisationsServiceSymbol);

    try {

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      if (queryParams.fields?.includes('organisationUnits')) {

        const result = await organisationsService.getOrganisationsWithUnitsList();
        context.res = ResponseHelper.Ok<ResponseDTO>(result.map(item => ({
          id: item.id,
          name: item.name,
          acronym: item.acronym,
          organisationUnits: item.organisationUnits.map(unit => ({
            id: unit.id,
            name: unit.name,
            acronym: unit.acronym
          }))
        })));
        return;

      } else {

        const result = await organisationsService.getOrganisationsList();
        context.res = ResponseHelper.Ok<ResponseDTO>(result.map(item => ({
          id: item.id,
          name: item.name,
          acronym: item.acronym
        })));
        return;

      }

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default openApi(GetOrganisations.httpTrigger as AzureFunction, '/v1/management/organisations', {
  get: {
    description: 'Get organisations list',
    operationId: 'getOrganisations',
    parameters: [],
    responses: {
      200: {
        description: 'Success',
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
        },
      },
    },
  },
});


