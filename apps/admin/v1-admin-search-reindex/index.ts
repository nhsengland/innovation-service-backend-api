import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import SYMBOLS from '../_services/symbols';
import type { SearchService } from '../_services/search.service';

class V1AdminSearchReindex {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const searchService = container.get<SearchService>(SYMBOLS.SearchService);

    try {
      await authorizationService.validate(context).checkAdminType().verify();

      await searchService.createAndPopulateIndex();

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AdminSearchReindex.httpTrigger as AzureFunction, '/v1/search/reindex', {
  post: {
    description: 'Create Index and Ingest all the documents',
    operationId: 'v1-admin-search-reindex',
    tags: ['[v1] Elastic Search'],
    responses: {
      204: { description: 'Index reindexed' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not Found' },
      500: { description: 'Internal Server Error' }
    }
  }
});
