import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import { QueryParamsSchema, QueryParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1InnovationsInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId)
        //.checkAssessmentType()
        //.checkAccessorType()
        //.checkInnovatorType()
        .verify();

      const requestUser = authInstance.getUserInfo();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, { userType: requestUser.type, userOrganisationRole: requestUser.organisations[0]?.role });

      const { ...filters } = queryParams;
      filters.fields
      const result = await innovationsService.getInnovationInfo(
        request.params['innovationId']!,
        { fields: filters.fields },
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        submittedAt: result.submittedAt,
        countryName: result.countryName,
        postCode: result.postCode,
        categories: result.categories,
        otherCategoryDescription: result.otherCategoryDescription,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          isActive: result.owner.isActive,
        },
        assessment: result.assessment ? {
          id: result.assessment.id,
          createdAt: result.assessment.createdAt,
          finishedAt: result.assessment.finishedAt,
          assignedTo: {
            name: result.assessment.assignedTo.name,
          },
        } : null,
        supports: result.supports ? result.supports.map(support => ({
          id: support.id,
          status: support.status,
        })) : null,
        lastEngagingSupportTransition: result.lastEngagingSupportTransition,
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}


export default openApi(V1InnovationsInfo.httpTrigger as AzureFunction, '/v1/{innovationId}', {
  get: {
    operationId: 'v1-innovations-info',
    description: 'Get innovation information.',
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'Innovation ID',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid innovation payload' },
    },
  },
});
