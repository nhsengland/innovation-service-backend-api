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

class EditInnovationAssessment {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    target: TargetEnum.ASSESSMENT,
    identifierResponseField: 'id'
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
        .checkInnovation({ status: [InnovationStatusEnum.IN_PROGRESS] })
        .verify();
      const domainContext = auth.getContext();
      const result = await innovationAssessmentsService.editInnovationAssessment(
        domainContext,
        params.innovationId,
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

export default openApi(EditInnovationAssessment.httpTrigger as AzureFunction, '/v1/{innovationId}/assessments/edit', {
  post: {
    summary: 'Create a new assessment when editing an assessment',
    description: 'Create a new assessment as a minor version of a previous assessment.',
    operationId: 'v1-innovation-assessment-edit',
    tags: ['Innovation Assessment'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The minor assessment version has been created.'
      }),
      400: {
        description: 'The minor assessment version has not been created.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to create a minor assessment version.'
      },
      404: {
        description: 'The innovation does not exist.'
      },
      500: {
        description: 'An error occurred while creating the minor assessment version.'
      }
    }
  }
});
