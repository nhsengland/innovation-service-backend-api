import type { HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';
import type { CustomContextType } from '@users/shared/types';
import { container } from '../_config';
import { SurveyServiceSymbol, SurveyServiceType } from '../_interfaces/services.interfaces';
import { SurveyBodySchema } from './validation';
/**
 * TODO: Rework this into a service
 */

class V1SurveyPOST {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const surveyBody = request.body;
      const surveyItem = JoiHelper.Validate(SurveyBodySchema, surveyBody);

      const surveyService = container.get<SurveyServiceType>(SurveyServiceSymbol);
      const result = await surveyService.save(surveyItem);

      context.res = ResponseHelper.Ok({ id: surveyService.getId(result) });

    } catch (error) {
      context.log.error(error);
      context.res = ResponseHelper.Error(error);
      return;
    }
  }
}

export default V1SurveyPOST.httpTrigger;