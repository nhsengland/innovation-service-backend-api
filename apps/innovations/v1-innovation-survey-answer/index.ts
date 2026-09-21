import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import { BodySchema, BodyType, ParamsSchema, type ParamsType } from './validation.schemas';
import { SurveysService } from '../_services/surveys.service';

class V1InnovationSurveyAnswer {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const surveysService = container.get<SurveysService>(SYMBOLS.SurveysService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      await surveysService.answerSurvey(auth.getContext(), params.surveyId, body);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationSurveyAnswer.httpTrigger as AzureFunction, '/v1/{innovationId}/surveys/{surveyId}', {
  patch: {
    description: 'Answer a survey',
    operationId: 'v1-innovation-survey-answer',
    tags: ['[v1] Innovation Surveys'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      204: { description: 'Survey answered successfuly' },
      400: { description: 'Bad request.' },
      401: { description: 'Unauthorized.' },
      403: { description: 'Forbidden.' },
      404: { description: 'Not found.' },
      500: { description: 'Internal server error.' }
    }
  }
});
