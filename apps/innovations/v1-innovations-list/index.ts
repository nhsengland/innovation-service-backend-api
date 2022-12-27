import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1InnovationsList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .verify();
      const requestUser = authInstance.getUserInfo();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, { userType: requestUser.type, userOrganisationRole: requestUser.organisations[0]?.role });

      const { skip, take, order, ...filters } = queryParams;

      const result = await innovationsService.getInnovationsList(
        {
          id: requestUser.id,
          type: requestUser.type,
          ...(requestUser.organisations[0]?.id ? { organisationId: requestUser.organisations[0].id } : {}),
          ...(requestUser.organisations[0]?.organisationUnits[0]?.id ? { organisationUnitId: requestUser.organisations[0].organisationUnits[0].id } : {}),
          ...(requestUser.organisations[0]?.role ? { organisationRole: requestUser.organisations[0]?.role } : {})
        },
        filters,
        { skip, take, order }
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          status: item.status,
          statusUpdatedAt: item.statusUpdatedAt,
          submittedAt: item.submittedAt,
          updatedAt: item.updatedAt,
          countryName: item.countryName,
          postCode: item.postCode,
          mainCategory: item.mainCategory,
          otherMainCategoryDescription: item.otherMainCategoryDescription,
          ...(item.isAssessmentOverdue === undefined ? {} : { isAssessmentOverdue: item.isAssessmentOverdue }),
          ...(item.assessment === undefined ? {} : { assessment: item.assessment }),
          ...(item.supports === undefined ? {} : {
            supports: item.supports.map(s => ({
              id: s.id,
              status: s.status,
              updatedAt: s.updatedAt,
              organisation: s.organisation
            }))
          }),
          ...(item.notifications === undefined ? {} : { notifications: item.notifications }),
          ...(item.statistics === undefined ? {} : { statistics: item.statistics }),
        }))
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}


export default openApi(V1InnovationsList.httpTrigger as AzureFunction, '/v1', {
  get: {
    operationId: 'v1-innovations-list',
    description: 'Get innovations list',
    parameters: SwaggerHelper.paramJ2S({query: QueryParamsSchema}),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for innovation object' },
              },
            },
          },
        },
      },
      400: { description: 'Invalid innovation payload' },
    },
  },
});
