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


class V1InnovationThreadCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();


      const result = await threadsService.createEditableThread(
        requestUser,
        pathParams.innovationId,
        body.subject,
        body.message,
        true,
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({
        thread: {
          id: result.thread.id,
          subject: result.thread.subject,
          createdBy: {
            id: result.thread.createdBy,
          },
          createdAt: result.thread.createdAt,
        }
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default V1InnovationThreadCreate.httpTrigger;