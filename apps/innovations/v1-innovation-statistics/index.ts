import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { StatisticsHandlersHelper } from '../_helpers/handlers.helper';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QuerySchema, QueryType } from './validation.schemas';

class GetInnovationStatistics {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const query = JoiHelper.Validate<QueryType>(QuerySchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const stats = await StatisticsHandlersHelper.runHandler(requestUser, domainContext, query.statistics, {
        innovationId: params.innovationId
      });

      context.res = ResponseHelper.Ok<ResponseDTO>(stats);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(GetInnovationStatistics.httpTrigger as AzureFunction, '/v1/{innovationId}/statistics', {
  get: {
    description: 'Get an innovation statistics',
    tags: ['[v1] Innovation Statistics'],
    operationId: 'v1-innovation-statistics',
    parameters: [{ in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } }],
    responses: {
      200: { description: 'Ok.' },
      400: { description: 'Bad request.' }
    }
  }
});
