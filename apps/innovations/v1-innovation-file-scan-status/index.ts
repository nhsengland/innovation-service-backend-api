import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import type { InnovationFileService } from '../_services/innovation-file.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';

class V1InnovationFileScanStatus {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationFileService = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      // Reuse file-info's innovation-scoped lookup and authorization path.
      // Never accept an arbitrary Blob name, account or container from the caller.
      const result = await innovationFileService.getFileInfo(auth.getContext(), params.innovationId, params.fileId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        scanState: result.file.scanState,
        canDownload: result.file.canDownload,
        ...(result.file.url && { url: result.file.url }),
        ...(result.file.scanState === 'scanning' && { retryAfterSeconds: 3 })
      });
      context.res['headers'] = { ...context.res['headers'], 'Cache-Control': 'no-store' };
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      context.res['headers'] = { ...context.res['headers'], 'Cache-Control': 'no-store' };
    }
  }
}

export default openApi(
  V1InnovationFileScanStatus.httpTrigger as AzureFunction,
  '/v1/{innovationId}/files/{fileId}/scan-status',
  {
    get: {
      operationId: 'v1-innovation-file-scan-status',
      description: 'Get the current malware scan state and download availability of an authorized file.',
      tags: ['[v1] Innovation Files'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, { description: 'Current scan state' }),
        400: { description: 'Invalid request' },
        401: { description: 'Not authenticated' },
        403: { description: 'Not authorized' },
        404: { description: 'File not found' },
        500: { description: 'An error occurred while processing the request' }
      }
    }
  }
);
