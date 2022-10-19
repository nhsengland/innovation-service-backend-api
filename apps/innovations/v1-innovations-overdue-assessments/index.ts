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


class V1InnovationsOverdueAssessments {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService.validate(context.auth.user.identityId)
        .checkAssessmentType()
        .verify();

      const result = await innovationsService.getNeedsAssessmentOverdueInnovations(queryParams.status);

      context.res = ResponseHelper.Ok<ResponseDTO>({ overdue: result });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}


export default openApi(V1InnovationsOverdueAssessments.httpTrigger as AzureFunction, '/v1/overdue-assessments', {
  get: {
    operationId: 'v1-innovations-overdue-assessments',
    description: 'Get assessment overdue innovations',
    parameters: [],
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
