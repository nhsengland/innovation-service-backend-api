import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { validationsHelper } from '../_config/admin-operations.config';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import { ValidationHandlersHelper } from '../_handlers/validations/validations.handlers.helper';

class V1AdminValidate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const data = {
        userId: params.userId,
        ...(queryParams.roleId && { userRoleId: queryParams.roleId }),
        ...(queryParams.role && { role: queryParams.role, organisationUnitIds: queryParams.organisationUnitIds })
      };
      JoiHelper.Validate(ValidationHandlersHelper.handlerJoiDefinition(queryParams.operation), data);

      await authorizationService.validate(context).checkAdminType().verify();

      const res = await validationsHelper(queryParams.operation, data);
      context.res = ResponseHelper.Ok<ResponseDTO>({ validations: res });

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
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'OK'
      }),
      '400': { description: 'Bad request.' },
      '401': { description: 'The user is not authorized to access validation data.' },
      '500': { description: 'An error occurred while fetching the validation data.' }
    }
  }
});
