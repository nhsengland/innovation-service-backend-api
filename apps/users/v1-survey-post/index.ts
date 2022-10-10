import type { HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import type { CustomContextType } from '@users/shared/types';
import { container } from '../_config';
import { SurveyServiceSymbol, SurveyServiceType } from '../_interfaces/services.interfaces';
import { ValidatePayload } from './validation';
/**
 * TODO: Rework this into a service
 */

class V1SurveyPOST {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const surveyItem = request.body;
    const validation = ValidatePayload(surveyItem);

    if (validation.error) {
      context.res = ResponseHelper.UnprocessableEntity({
        error: 'Payload validation failed'
      });

      return;
    }

    try {

      const surveyService = container.get<SurveyServiceType>(SurveyServiceSymbol);
      const result = await surveyService.save(request.body);

      context.res = ResponseHelper.Ok({ id: surveyService.getId(result) });

    } catch (error) {
      context.log.error(error);
      context.res = ResponseHelper.Internal({
        error: "Error occured while saving to the datastore.",
      });
      return;
    }
  }
}

export default V1SurveyPOST.httpTrigger;