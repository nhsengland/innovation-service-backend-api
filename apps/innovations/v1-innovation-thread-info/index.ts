import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationThreadsService } from '../_services/innovation-threads.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationThreadInfo {
  @JwtDecoder()
  @Audit({ action: ActionEnum.READ, target: TargetEnum.THREAD, identifierParam: 'threadId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const threadsService = container.get<InnovationThreadsService>(SYMBOLS.InnovationThreadsService);

    try {
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(pathParams.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await threadsService.getThreadInfo(pathParams.threadId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        subject: result.subject,
        context: result.context,
        createdAt: result.createdAt,
        createdBy: {
          id: result.createdBy.id,
          name: result.createdBy.name
        }
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationThreadInfo.httpTrigger as AzureFunction, '/v1/{innovationId}/threads/{threadId}', {
  get: {
    summary: 'Get Innovation Thread Info',
    description: 'Get Innovation Thread Info',
    tags: ['Innovation Thread'],
    operationId: 'v1-innovation-thread-info',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                },
                subject: {
                  type: 'string'
                },
                createdAt: {
                  type: 'string'
                },
                createdBy: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string'
                    },
                    name: {
                      type: 'string'
                    },
                    type: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      404: {
        description: 'Not Found'
      },
      500: {
        description: 'Internal Server Error'
      }
    }
  }
});
