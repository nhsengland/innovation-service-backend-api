import type { HttpRequest } from '@azure/functions'

import {
  AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';

import type {
  CustomContextType
} from '@innovations/shared/types'

import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JwtDecoder } from '@innovations/shared/decorators'

import { container } from '../_config';
import { InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsType, ParamsSchema } from './validation.schema';


class CreateInnovationAssessment {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationAssessmentsService = container.get<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkInnovation({ status: [InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT] })
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationAssessmentsService.createInnovationAssessment(
        { id: requestUser.id },
        params.innovationId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default CreateInnovationAssessment.httpTrigger;
