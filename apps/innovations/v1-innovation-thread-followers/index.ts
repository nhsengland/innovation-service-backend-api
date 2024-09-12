import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService, DomainService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationThreadFollowers {
  @JwtDecoder()
  @Audit({ action: ActionEnum.READ, target: TargetEnum.THREAD, identifierParam: 'threadId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);

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

      const result = await domainService.innovations.threadFollowers(pathParams.threadId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        followers: result.map(follower => ({
          id: follower.id,
          name: follower?.name ?? '',
          isLocked: follower.locked,
          isOwner: follower.isOwner,
          role: { id: follower.userRole.id, role: follower.userRole.role },
          organisationUnit: follower.organisationUnit
            ? {
                id: follower.organisationUnit.id,
                name: follower.organisationUnit.name,
                acronym: follower.organisationUnit.acronym
              }
            : null
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadFollowers.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/followers',
  {
    get: {
      summary: 'Get Innovation Thread Followers',
      description: 'Get Innovation Thread Followers',
      tags: ['Innovation Thread'],
      operationId: 'v1-innovation-thread-followers',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  participants: {
                    type: 'array',
                    items: {
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
                        },
                        organisationUnit: {
                          type: 'object',
                          properties: {
                            id: {
                              type: 'string'
                            },
                            acronym: {
                              type: 'string'
                            }
                          }
                        }
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
  }
);
