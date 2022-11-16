import type { HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import {
    AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { ParamsSchema, ParamsType } from './validation.schemas';


class GetInnovationStatistics {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    
    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

     
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default GetInnovationStatistics.httpTrigger;