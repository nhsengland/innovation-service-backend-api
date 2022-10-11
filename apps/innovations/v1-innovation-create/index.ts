import type { HttpRequest } from '@azure/functions'

import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@innovations/shared/services';
import {
  JwtDecoder,
} from '@innovations/shared/decorators'

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import type { CustomContextType } from '@innovations/shared/types';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';


class CreateInnovation {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {


      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const query = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query)

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .verify();
      const requestUser = auth.getUserInfo();

      let surveyId;
      if (query.isSurvey) surveyId = requestUser.surveyId;

      const result = await innovationService.createInnovation({ id: requestUser.id }, body, surveyId);
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default CreateInnovation.httpTrigger;
