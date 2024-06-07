import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { ResponseHelper } from '@admin/shared/helpers';
import type { CustomContextType } from '@admin/shared/types';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { SchemaModel } from '@admin/shared/models';
import { BadRequestError, GenericErrorsEnum } from '@admin/shared/errors';
import type { AuthorizationService } from '@admin/shared/services';

import { container } from '../_config';
import type { SchemaService } from '../_services/schema.service';
import SYMBOLS from '../_services/symbols';

class V1IrSchemaCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const schemaService = container.get<SchemaService>(SYMBOLS.SchemaService);

    try {
      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const schemaModel = new SchemaModel(request.body);
      const { schema, errors } = schemaModel.runRules();

      if (errors.length > 0 || !schema) {
        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { details: errors });
      }

      await schemaService.create(auth.getContext(), schema);

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
    // requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      '204': { description: 'IR schema created' },
      '400': { description: 'Bad request' },
      '401': { description: 'Not authorized' },
      '500': { description: 'An error occurred' }
    }
  }
});
