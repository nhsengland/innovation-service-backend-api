import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import { SwaggerHelper } from '@admin/shared/helpers';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { container } from '../_config';
import { statisticsHelper } from '../_config/statistics.config';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QuerySchema, QueryType } from './validation.schemas';

class GetOrganisationUnitStatistics {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const query = JoiHelper.Validate<QueryType>(QuerySchema, request.query);

      await authorizationService.validate(context).checkAdminType().verify();

      const res = await statisticsHelper(query.statistics, { organisationUnitId: params.unit });
      context.res = ResponseHelper.Ok<ResponseDTO>(res);

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(
  GetOrganisationUnitStatistics.httpTrigger as AzureFunction,
  '/v1/organisation-unit/{unit}/statistics',
  {
    get: {
      description: 'Get an organisation unit statistics',
      tags: ['[v1] Organisation Unit Statistics'],
      operationId: 'v1-organisation-unit-statistics',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: QuerySchema }),
      responses: {
        200: { description: 'Ok.' },
        400: { description: 'Bad request.' }
      }
    }
  }
);
