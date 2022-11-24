import type { HttpRequest } from '@azure/functions';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import { JwtDecoder } from '@users/shared/decorators';
import { type AuthorizationServiceType, AuthorizationServiceSymbol } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
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

export default GetUserStatistics.httpTrigger;
