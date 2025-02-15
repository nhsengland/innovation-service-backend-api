import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationAssessmentInfo {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.READ,
    target: TargetEnum.ASSESSMENT,
    identifierParam: 'assessmentId'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationAssessmentsService = container.get<InnovationAssessmentsService>(
      SYMBOLS.InnovationAssessmentsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      const result = await innovationAssessmentsService.getInnovationAssessmentInfo(domainContext, params.assessmentId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        majorVersion: result.majorVersion,
        minorVersion: result.minorVersion,
        editReason: result.editReason,
        ...(result.previousAssessment && { previousAssessment: result.previousAssessment }),
        ...(result.reassessment === undefined ? {} : { reassessment: result.reassessment }),
        summary: result.summary,
        description: result.description,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        ...(result.assignTo && { assignTo: { id: result.assignTo.id, name: result.assignTo.name } }),
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
          id: item.id,
          name: item.name,
          acronym: item.acronym,
          units: item.units.sort((a, b) => a.name.localeCompare(b.name))
        })),
        updatedAt: result.updatedAt,
        updatedBy: result.updatedBy,
        isLatest: result.isLatest
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationAssessmentInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/assessments/{assessmentId}',
  {
    get: {
      summary: 'Get Innovation Assessment Info',
      description: 'Get Innovation Assessment Info',
      tags: ['Innovation Assessment Info'],
      operationId: 'v1-innovation-assessment-info',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Success'
        }),
        400: {
          description: 'Bad Request'
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
