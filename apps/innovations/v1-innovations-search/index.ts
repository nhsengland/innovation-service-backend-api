import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { SearchService } from '../_services/search.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationsSearch {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const searchService = container.get<SearchService>(SYMBOLS.SearchService);

    try {
      const authInstance = await authorizationService
        .validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkAdminType()
        .verify();
      const domainContext = authInstance.getContext();

      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query, {
        userType: domainContext.currentRole.role
      });
      const { skip, take, order, fields, ...filters } = queryParams;

      // TODO: fix this as any
      const response = await searchService.getDocuments(domainContext, {
        fields: fields as any,
        filters,
        pagination: { skip, take, order }
      });

      context.res = ResponseHelper.Ok<ResponseDTO>(response as any); // todo fix this any

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationsSearch.httpTrigger as AzureFunction, '/v1/search', {
  get: {
    operationId: 'v1-innovations-search',
    description: 'Get search innovations list',
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
    responses: {
      204: { description: 'Success' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' },
      500: { description: 'Internal Server Error' }
    }
  }
});
