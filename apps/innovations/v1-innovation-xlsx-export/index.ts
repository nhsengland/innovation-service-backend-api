import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import SYMBOLS from '../_services/symbols';
import type { ExcelInnovationService } from '../_services/excel-innovation.service';

class V1InnovationRecordXlsxExport {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const excelInnovationService = container.get<ExcelInnovationService>(SYMBOLS.ExcelInnovationService);

    try {
      await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAdminType()
        .verify();

      // payload should be the InnovationRecordDocumentType JSON object
      const xlsxBuffer = await excelInnovationService.generateExport(request.body);
      const base64Content = xlsxBuffer.toString('base64');

      context.res = {
        status: 200,
        body: base64Content,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Encoding': 'base64'
        }
      };
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(V1InnovationRecordXlsxExport.httpTrigger as AzureFunction, '/v1/innovation-record/xlsx', {
  post: {
    description: 'Generate a pre-filled Excel file for a given innovation record JSON payload',
    tags: ['[v1] Innovations'],
    operationId: 'v1-innovation-record-xlsx-export',
    requestBody: {
      description: 'Innovation Record payload (InnovationRecordDocumentType)',
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    },
    responses: {
      200: {
        description: 'Excel file result',
        content: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            schema: { type: 'string' }
          }
        }
      },
      400: { description: 'Bad request.' }
    }
  }
});
