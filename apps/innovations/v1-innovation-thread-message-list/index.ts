import type { HttpRequest } from '@azure/functions'

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationThreadsServiceSymbol, InnovationThreadsServiceType } from '../_services/interfaces';

import { ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema } from './validation.schemas';


class V1InnovationThreadMessageList {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await threadsService.getThreadMessagesList(
        requestUser,
        pathParams.threadId,
        queryParams.skip,
        queryParams.take,
        queryParams.order,
      )


      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        messages: result.messages.map(message => ({
          id: message.id,
          createdAt: message.createdAt,
          createdBy: {
            id: message.createdBy.id,
            name: message.createdBy.name,
            type: message.createdBy.type,
            organisationUnit: {
              id: message.createdBy.organisationUnit?.id!, // if the organisationUnit exists, then all props are ensured to exist
              name: message.createdBy.organisationUnit?.name!,
              acronym: message.createdBy.organisationUnit?.acronym!,
            },
            organisation: {
              id: message.createdBy.organisation?.id!, // if the organisation exists, then all props are ensured to exist
              name: message.createdBy.organisation?.name!,
              acronym: message.createdBy.organisation?.acronym!,
            },
          },
          isEditable: message.isEditable,
          isNew: message.isNew,
          message: message.message,
          updatedAt: message.updatedAt,
        })),
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default V1InnovationThreadMessageList.httpTrigger;