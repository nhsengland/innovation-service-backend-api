import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService, IRSchemaService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { ResponseDTO } from './transformation.dtos';

class V1IrSchemaInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const irSchemaService = container.get<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService);

    try {
      await authorizationService
        .validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      const schema = await irSchemaService.getSchema();

      context.res = ResponseHelper.Ok<ResponseDTO>(schema);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1IrSchemaInfo.httpTrigger as AzureFunction, '/v1/ir-schema', {
  get: {
    operationId: 'v1-ir-schema-info',
    description: 'Get current ir schema',
    tags: ['[v1] IR Schema'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { type: 'object', properties: {} }
          }
        }
      },
      400: { description: 'Bad request' },
      401: { description: 'Not authorized' },
      403: { description: 'Forbidden' },
      500: { description: 'An error occurred' }
    }
  }
});
