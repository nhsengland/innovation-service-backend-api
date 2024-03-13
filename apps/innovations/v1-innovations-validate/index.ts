import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { ValidationService } from '../_services/validation.service';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationsValidate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const validationService = container.get<ValidationService>(SYMBOLS.ValidationService);

    try {
      const { operation, ...inputData } = request.query;
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, { operation });

      // All roles will have access to this endpoint and skipping innovation validation since the checks will do it
      const auth = await authorizationService.validate(context).verify();
      // other queryParams validation will be handled by the validationsHelper function

      const res = await validationService.validate(
        auth.getContext(),
        queryParams.operation,
        params.innovationId,
        inputData
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({ validations: res });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationsValidate.httpTrigger as AzureFunction, '/v1/{innovationId}/validate', {
  get: {
    description: 'Get validation information.',
    operationId: 'v1-innovations-validate',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      '200': {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                validations: {
                  type: 'object',
                  description: 'Validation data.'
                }
              }
            }
          }
        }
      },
      '400': { description: 'Bad request.' },
      '401': { description: 'The user is not authorized to access validation data.' },
      '500': { description: 'An error occurred while fetching the validation data.' }
    }
  }
});
