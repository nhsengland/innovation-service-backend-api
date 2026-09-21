import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService, IRSchemaService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import type { SchemaDocGeneratorService } from '@innovations/shared/services/storage/schema-doc-generator.service';

class V1InnovationDocsExport {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, _request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const irSchemaService = container.get<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService);
    const schemaDocGeneratorService = container.get<SchemaDocGeneratorService>(SHARED_SYMBOLS.SchemaDocGeneratorService);

    try {
      await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      const schema = await irSchemaService.getSchema();
      const markdownContent = schemaDocGeneratorService.generateMarkdownSpec(schema.model.schema);

      context.res = {
        status: 200,
        body: markdownContent,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': 'attachment; filename="NHS-Innovation-API-Spec.md"'
        }
      };
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(V1InnovationDocsExport.httpTrigger as AzureFunction, '/v1/innovation-record/docs', {
  get: {
    description: 'Get the API integration specification for the Innovation Record in Markdown format.',
    tags: ['[v1] Innovations'],
    operationId: 'v1-innovation-record-docs',
    responses: {
      200: {
        description: 'Markdown specification file',
        content: {
          'text/markdown': {
            schema: { type: 'string' }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
});
