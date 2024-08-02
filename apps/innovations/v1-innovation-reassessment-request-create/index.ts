import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationReassessmentRequestCreate {
  @JwtDecoder()
  @ElasticSearchDocumentUpdate()
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
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body, {
        userRole: domainContext.currentRole.role
      });

      const result = await innovationAssessmentsService.createInnovationReassessment(
        domainContext,
        params.innovationId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.assessment.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationReassessmentRequestCreate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/reassessments',
  {
    post: {
      operationId: 'v1-innovation-reassessment-request-create',
      description: 'Create a reassessment request for an innovation.',
      summary: 'Create a reassessment request for an innovation.',
      tags: ['[v1] Innovation Assessments'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
        description: 'Create a reassessment request for an innovation.'
      }),
      responses: {
        200: { description: 'Returns the reassessment request and the cloned assessment id' },
        400: { description: 'Bad request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        422: { description: 'Unprocessable entity' },
        500: { description: 'Internal server error' }
      }
    }
  }
);
