import type { HttpRequest } from '@azure/functions'

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import type { ParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema } from './validation.schemas';


class V1InnovationThreadMessageInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const result = await threadsService.getThreadMessageInfo(
        pathParams.messageId,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        message: result.message,
        createdAt: result.createdAt,
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default V1InnovationThreadMessageInfo.httpTrigger;