import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UserStatisticsEnum } from '../_enums/user.enums';
import { StatisticsHandlersHelper } from '../_helpers/handlers.helper';
import type { ResponseDTO } from './transformation.dtos';
import { QuerySchema, QueryType } from './validation.schemas';

class GetUserStatistics {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);

    try {
      const query = JoiHelper.Validate<QueryType>(QuerySchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .checkAccessorType()
        .checkInnovatorType()
        .checkAssessmentType()
        .verify();

      const domainContext = auth.getContext();

      const stats = await StatisticsHandlersHelper.runHandler(domainContext, query.statistics);

      context.res = ResponseHelper.Ok<ResponseDTO>(stats);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(GetUserStatistics.httpTrigger as AzureFunction, '/v1/statistics', {
  get: {
    description: 'Get an user statistics',
    operationId: 'v1-users-statistics',
    tags: ['[v1] User Statistics'],
    parameters: SwaggerHelper.paramJ2S({ query: QuerySchema }),
    responses: {
      200: {
        description: 'Ok',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    }
  }
});
