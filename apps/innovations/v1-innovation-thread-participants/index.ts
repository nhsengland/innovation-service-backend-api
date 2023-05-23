import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
  DomainServiceSymbol,
  DomainServiceType
} from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationThreadParticipants {
  @JwtDecoder()
  @Audit({ action: ActionEnum.READ, target: TargetEnum.THREAD, identifierParam: 'threadId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const domainService = container.get<DomainServiceType>(DomainServiceSymbol);

    try {
      const pathParams = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .verify();

      const result = await domainService.innovations.threadIntervenients(pathParams.threadId);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        participants: result.map(participant => ({
          id: participant.id,
          name: participant?.name ?? '',
          type: participant.userRole.role,
          ...(participant.isOwner !== undefined && { isOwner: participant.isOwner }),
          organisationUnit: participant.organisationUnit
            ? {
                id: participant.organisationUnit.id,
                acronym: participant.organisationUnit.acronym
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
  V1InnovationThreadParticipants.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/{threadId}/participants',
  {
    get: {
      summary: 'Get Innovation Thread Participants',
      description: 'Get Innovation Thread Participants',
      tags: ['Innovation Thread'],
      operationId: 'v1-innovation-thread-participants',
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
