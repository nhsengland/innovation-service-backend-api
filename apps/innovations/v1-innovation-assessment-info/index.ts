import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import {
    AuthorizationServiceSymbol, AuthorizationServiceType
} from '@innovations/shared/services';

import type {
    CustomContextType
} from '@innovations/shared/types';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { container } from '../_config';
import { InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class GetInnovationAssessmentInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationAssessmentsService = container.get<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const result = await innovationAssessmentsService.getInnovationAssessmentInfo(params.assessmentId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        summary: result.summary,
        description: result.description,
        finishedAt: result.finishedAt,
        assignTo: { id: result.assignTo.id, name: result.assignTo.name },
        maturityLevel: result.maturityLevel,
        maturityLevelComment: result.maturityLevelComment,
        hasRegulatoryApprovals: result.hasRegulatoryApprovals,
        hasRegulatoryApprovalsComment: result.hasRegulatoryApprovalsComment,
        hasEvidence: result.hasEvidence,
        hasEvidenceComment: result.hasEvidenceComment,
        hasValidation: result.hasValidation,
        hasValidationComment: result.hasValidationComment,
        hasProposition: result.hasProposition,
        hasPropositionComment: result.hasPropositionComment,
        hasCompetitionKnowledge: result.hasCompetitionKnowledge,
        hasCompetitionKnowledgeComment: result.hasCompetitionKnowledgeComment,
        hasImplementationPlan: result.hasImplementationPlan,
        hasImplementationPlanComment: result.hasImplementationPlanComment,
        hasScaleResource: result.hasScaleResource,
        hasScaleResourceComment: result.hasScaleResourceComment,
        suggestedOrganisations: result.suggestedOrganisations.map(item => ({
          id: item.id, name: item.name, acronym: item.acronym,
          units: item.units
        })),
        updatedAt: result.updatedAt,
        updatedBy: result.updatedBy
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(GetInnovationAssessmentInfo.httpTrigger as AzureFunction, 'v1/:innovationId/assessment/:assessmentId/info', {
  get: {
    summary: 'Get Innovation Assessment Info',
    description: 'Get Innovation Assessment Info',
    tags: ['Innovation Assessment Info'],
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        description: 'Innovation Id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
      {
        name: 'assessmentId',
        in: 'path',
        description: 'Assessment Id',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                summary: { type: 'string' },
                description: { type: 'string' },
                finishedAt: { type: 'string', format: 'date-time' },
                assignTo: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' }
                  }
                },
                maturityLevel: { type: 'string' },
                maturityLevelComment: { type: 'string' },
                hasRegulatoryApprovals: { type: 'boolean' },
                hasRegulatoryApprovalsComment: { type: 'string' },
                hasEvidence: { type: 'boolean' },
                hasEvidenceComment: { type: 'string' },
                hasValidation: { type: 'boolean' },
                hasValidationComment: { type: 'string' },
                hasProposition: { type: 'boolean' },
                hasPropositionComment: { type: 'string' },
                hasCompetitionKnowledge: { type: 'boolean' },
                hasCompetitionKnowledgeComment: { type: 'string' },
                hasImplementationPlan: { type: 'boolean' },
                hasImplementationPlanComment: { type: 'string' },
                hasScaleResource: { type: 'boolean' },
                hasScaleResourceComment: { type: 'string' },
                suggestedOrganisations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      acronym: { type: 'string' },
                      units: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            acronym: { type: 'string' },
                            organisation: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                                acronym: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                updatedAt: { type: 'string', format: 'date-time' },
                updatedBy: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' }
                  }
                },
              }
            }
          }
        }
      },
      400: {
        description: 'Bad Request',
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
      404: {
        description: 'Not Found',
      },
      500: {
        description: 'Internal Server Error',
      }
    }
  }
});
