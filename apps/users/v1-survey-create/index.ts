import type { AzureFunction, HttpRequest } from '@azure/functions';
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { SurveyServiceSymbol, SurveyServiceType } from '../_services/interfaces';

import { BodySchema, BodyType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1SurveyCreate {

  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const surveyService = container.get<SurveyServiceType>(SurveyServiceSymbol);

    try {

      const surveyItem = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const result = await surveyService.saveSurvey(surveyItem);

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }

  }

}

// TODO: Improve parameters
export default openApi(V1SurveyCreate.httpTrigger as AzureFunction, '/v1/survey', {
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
