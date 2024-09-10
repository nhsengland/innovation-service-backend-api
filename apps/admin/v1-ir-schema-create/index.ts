import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { CustomContextType } from '@admin/shared/types';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { AuthorizationService, IRSchemaService } from '@admin/shared/services';

import { container } from '../_config';

class V1IrSchemaCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const irSchemaService = container.get<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService);

    try {
      const auth = await authorizationService.validate(context).checkAdminType().verify();

      await irSchemaService.updateSchema(request.body, auth.getContext().id);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1IrSchemaCreate.httpTrigger as AzureFunction, '/v1/ir-schema', {
  post: {
    description: 'Create IR schema',
    operationId: 'v1-ir-schema-create',
    responses: {
      '204': { description: 'IR schema created' },
      '400': { description: 'Bad request' },
      '401': { description: 'Not authorized' },
      '500': { description: 'An error occurred' }
    }
  }
});
