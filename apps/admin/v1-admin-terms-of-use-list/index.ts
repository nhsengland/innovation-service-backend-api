import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { SwaggerHelper } from '@admin/shared/helpers/swagger.helper';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { TermsOfUseService } from '../_services/terms-of-use.service';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1AdminTermsOfUseList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const toUService = container.get<TermsOfUseService>(SYMBOLS.TermsOfUseService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await toUService.getTermsOfUseList(queryParams);

      context.res = ResponseHelper.Ok<ResponseDTO>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminTermsOfUseList.httpTrigger as AzureFunction, '/v1/tou', {
  get: {
    description: 'List of terms of use.',
    operationId: 'v1-admin-terms-of-use-list',
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
    responses: {
      '200': SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The list of terms of use versions.'
      }),
      '400': {
        description: 'Bad request.'
      },
      '401': {
        description: 'The user is not authorized to get terms of use.'
      },
      '500': {
        description: 'An error occurred while listing the terms of use.'
      }
    }
  }
});
