import type { HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { type AuthorizationServiceType, AuthorizationServiceSymbol } from '@innovations/shared/services';

import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { StatisticsHandlersHelper } from '../_helpers/handlers.helper';
import { ParamsSchema, ParamsType, QuerySchema, QueryType } from './validation.schemas';


class GetInnovationStatistics {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    
    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const query = JoiHelper.Validate<QueryType>(QuerySchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();

      const statistics = [];

      for (const statistic of query.statistics) {

        const stat = await StatisticsHandlersHelper.runHandler(
          { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
          statistic,
          { innovationId: params.innovationId }
        ); 
        
        statistics.push(stat.getStatistics());
        
      }
  
      const result = StatisticsHandlersHelper.buildResponse(statistics)
      
      context.res = ResponseHelper.Ok(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default GetInnovationStatistics.httpTrigger;
