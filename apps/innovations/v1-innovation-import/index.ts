import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import SYMBOLS from '../_services/symbols';
import type { ExcelInnovationService } from '../_services/excel-innovation.service';
import { BodySchema, type BodyType } from './validation.schemas';

class V1InnovationImport {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    identifierResponseField: 'id',
    target: TargetEnum.INNOVATION
  })
  @ElasticSearchDocumentUpdate({ identifierResponseField: 'id' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const excelInnovationService = container.get<ExcelInnovationService>(SYMBOLS.ExcelInnovationService);

    try {
      const parsedBody = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      let result: { id: string; validationIssues: Record<string, string[]>; emptySections: string[] };
      if (parsedBody.format === 'excel' && parsedBody.file) {
        result = await excelInnovationService.importInnovation(auth.getContext(), parsedBody.file);
      } else if (parsedBody.format === 'json' && parsedBody.payload) {
        result = await excelInnovationService.importInnovationFromJson(auth.getContext(), parsedBody.payload);
      } else {
        throw new Error('Invalid format or missing payload.');
      }
      
      context.res = ResponseHelper.Ok<{ id: string; validationIssues: Record<string, string[]>; emptySections: string[] }>(result);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(V1InnovationImport.httpTrigger as AzureFunction, '/v1/innovations/import', {
  post: {
    description: 'Create a new innovation record as DRAFT by importing a filled-in Excel file or JSON payload.',
    tags: ['[v1] Innovations'],
    operationId: 'v1-innovation-import',
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The import payload containing either base64 Excel file or JSON object.'
    }),
    responses: {
      200: {
        description: 'New innovation record ID with any validation warnings.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                validationIssues: {
                  type: 'object',
                  additionalProperties: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                emptySections: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      },
      400: { description: 'Invalid payload' },
      422: { description: 'Unprocessable entity' }
    }
  }
});
