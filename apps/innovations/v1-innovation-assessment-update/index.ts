import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationAssessmentUpdate {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.UPDATE,
    target: TargetEnum.ASSESSMENT,
    identifierParam: 'assessmentId'
  })
  @ElasticSearchDocumentUpdate()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationAssessmentsService = container.get<InnovationAssessmentsService>(
      SYMBOLS.InnovationAssessmentsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkInnovation({
          status: [
            InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT,
            InnovationStatusEnum.NEEDS_ASSESSMENT,
            InnovationStatusEnum.IN_PROGRESS
          ]
        })
        .verify();
      const domainContext = auth.getContext();
      const result = await innovationAssessmentsService.updateInnovationAssessment(
        domainContext,
        params.innovationId,
        params.assessmentId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationAssessmentUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/assessments/{assessmentId}',
  {
    put: {
      summary: 'Update an innovation assessment',
      description: 'Update an innovation assessment.',
      operationId: 'v1-innovation-assessment-update',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'Innovation assessment update request body.' }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'Returns the updated innovation assessment.'
        }),
        400: {
          description: 'Bad request. Validation error.'
        },
        401: {
          description: 'Unauthorized. Invalid authentication credentials.'
        },
        403: {
          description: 'Forbidden. User does not have permission to update the innovation assessment.'
        },
        404: {
          description: 'Not found. Innovation or assessment not found.'
        },
        500: {
          description: 'Internal server error.'
        }
      }
    }
  }
);
