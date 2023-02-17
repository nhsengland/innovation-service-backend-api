import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { ValidationServiceSymbol, ValidationServiceType } from '../_services/interfaces';
import { container } from '../_config';

import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import type { ResponseDTO } from './transformation.dtos';


class V1AdminValidate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const validationService = container.get<ValidationServiceType>(ValidationServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService
        .validate(context)
        .checkAdminType()
        .verify();

      const result = await validationService.validate(queryParams.operation, params.userId);

      context.res = ResponseHelper.Ok<ResponseDTO>({ validations: result });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminValidate.httpTrigger as AzureFunction, '/v1/users/{userId}/validate', {
  get: {
    description: 'Get validation information.',
    operationId: 'v1-admin-validate',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema, query: QueryParamsSchema }),
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
