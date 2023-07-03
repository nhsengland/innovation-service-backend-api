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
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationFileDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationFilesService = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();

      await innovationFilesService.deleteFile(auth.getContext(), params.fileId);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationFileDelete.httpTrigger as AzureFunction, '/v1/{innovationId}/files/{fileId}', {
  delete: {
    operationId: 'v1-innovation-file-delete',
    description: 'Delete an innovation file.',
    tags: ['[v1] Innovation Files'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      204: { description: 'Success.' },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' },
      404: { description: 'Not found' },
      500: { description: 'Internal server error' }
    }
  }
});
