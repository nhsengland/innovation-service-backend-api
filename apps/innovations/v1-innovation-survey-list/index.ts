import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';
import { SurveysService } from '../_services/surveys.service';

class V1InnovationSurveyList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const surveysService = container.get<SurveysService>(SYMBOLS.SurveysService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const result = await surveysService.getUnansweredSurveys(auth.getContext(), params.innovationId);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationSurveyList.httpTrigger as AzureFunction, '/v1/{innovationId}/surveys', {
  get: {
    description: 'Get a list of all unanswered surveys',
    operationId: 'v1-innovation-survey-list',
    tags: ['[v1] Innovation Surveys'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, { description: 'Success' }),
      400: { description: 'Bad request.' },
      401: { description: 'Unauthorized.' },
      403: { description: 'Forbidden.' },
      404: { description: 'Not found.' },
      500: { description: 'Internal server error.' }
    }
  }
});
