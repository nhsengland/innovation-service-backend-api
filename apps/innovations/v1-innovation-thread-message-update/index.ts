import type { HttpRequest } from '@azure/functions'

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import { BodySchema, BodyType, ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema } from './validation.schemas';


class V1InnovationThreadMessageUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const result = await threadsService.updateThreadMessage(
        pathParams.messageId,
        { message: body.message },
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default V1InnovationThreadMessageUpdate.httpTrigger;