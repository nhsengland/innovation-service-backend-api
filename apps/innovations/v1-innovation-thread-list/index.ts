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


class V1InnovationThreadCreate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const threadsService = container.get<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol);

    try {

      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const query = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await threadsService.getInnovationThreads(
        requestUser,
        pathParams.innovationId,
        query.skip,
        query.take,
        query.orderBy,
      )
      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        threads: result.threads.map(thread => ({
          id: thread.id,
          subject: thread.subject,
          messageCount: thread.messageCount,
          createdAt: thread.createdAt,
          isNew: thread.isNew,
          lastMessage: {
            id: thread.lastMessage.id,
            createdAt: thread.lastMessage.createdAt,
            createdBy: {
              id: thread.lastMessage.createdBy.id,
              name: thread.lastMessage.createdBy.name,
              type: thread.lastMessage.createdBy.type,
              organisationUnit: {
                id: thread.lastMessage.createdBy.organisationUnit?.id!, // if the organisationUnit exists, then all props are ensured to exist
                name: thread.lastMessage.createdBy.organisationUnit?.name!, // if the organisationUnit exists, then all props are ensured to exist
                acronym: thread.lastMessage.createdBy.organisationUnit?.acronym!, // if the organisationUnit exists, then all props are ensured to exist
              },
            },
          },
        })),
      });

      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default V1InnovationThreadCreate.httpTrigger;