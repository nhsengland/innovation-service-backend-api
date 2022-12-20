import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, type AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UserStatisticsEnum } from '../_enums/user.enums';
import { StatisticsHandlersHelper } from '../_helpers/handlers.helper';
import type { ResponseDTO } from './transformation.dtos';
import { QuerySchema, QueryType } from './validation.schemas';


class GetUserStatistics {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    
    try {

      const query = JoiHelper.Validate<QueryType>(QuerySchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkAccessorType()
        .checkInnovatorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();

        const stats = await StatisticsHandlersHelper.runHandler(
          requestUser,
          query.statistics,
        ); 
    
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
    parameters: [
      { in: 'query', name: 'statistics', required: false, schema: { type: 'string', enum: Object.keys(UserStatisticsEnum) } },
    ],
    responses: {
      200: {
        description: 'Ok',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            },
          }
        }
      },
    },
  },
});

