import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi as openApi } from '@users/shared/openapi';

import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { CustomContextType } from '@users/shared/types';
import { container } from '../_config';
import { SurveyServiceSymbol, SurveyServiceType } from '../_services/interfaces';
import { ResponseDTO, SurveyBodySchema } from './transformation.dtos';
/**
 * TODO: Rework this into a service
 */

class V1SurveyPOST {

  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const surveyBody = request.body;
      const surveyItem = JoiHelper.Validate(SurveyBodySchema, surveyBody);

      const surveyService = container.get<SurveyServiceType>(SurveyServiceSymbol);
      const result = await surveyService.save(surveyItem);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: surveyService.getId(result) });
      return;
    } catch (error) {
      context.log.error(error);
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default openApi(V1SurveyPOST.httpTrigger as AzureFunction, '/v1/survey', {
  post: {
    parameters: [],
    responses: {
      200: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for survey object' },
              }
            }
          }
        }
      },
      400: { description: 'Invalida survey payload' }
    }
  }

});
