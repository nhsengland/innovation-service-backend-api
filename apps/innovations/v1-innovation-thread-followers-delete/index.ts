import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { ForbiddenError, InnovationErrorsEnum } from '@innovations/shared/errors';
import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationThreadFollowersDelete {
  @JwtDecoder()
  @Audit({ action: ActionEnum.UPDATE, target: TargetEnum.THREAD, identifierParam: 'threadId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkAssessmentType()
        .verify();
      const domainContext = auth.getContext();

      if (domainContext.currentRole.id !== params.roleId) {
        throw new ForbiddenError(InnovationErrorsEnum.INNOVATION_THREAD_CANT_UNFOLLOW_OTHER_USERS);
      }

      await threadsService.unfollowThread(params.roleId, params.threadId);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadFollowersDelete.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/followers/{roleId}',
  {
    delete: {
      description: 'Innovation Thread delete follower',
      tags: ['Innovation Thread'],
      operationId: 'v1-innovation-thread-followers-delete',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        204: { description: 'Success' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not Found' },
        500: { description: 'Internal Server Error' }
      }
    }
  }
);
