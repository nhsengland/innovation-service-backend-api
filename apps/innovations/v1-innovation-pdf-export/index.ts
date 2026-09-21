import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { ExportFileService } from '../_services/export-file-service';
import SYMBOLS from '../_services/symbols';
import { BodySchema, ParamsSchema, ParamsType, type BodyType } from './validation.schemas';
class PostInnovationPDFExport {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const exportFileService = container.get<ExportFileService>(SYMBOLS.ExportFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAdminType()
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();
      const innovation = auth.getInnovationInfo();

      const pdf = await exportFileService.create(
        auth.getContext(),
        'pdf',
        { name: innovation.name, uniqueId: innovation.uniqueId },
        body
      );

      context.res = {
        body: pdf,
        headers: {
          'Content-Type': 'application/pdf'
        }
      };

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(PostInnovationPDFExport.httpTrigger as AzureFunction, '/v1/{innovationId}/pdf', {
  post: {
    description: 'Generate PDF for an innovation',
    tags: ['[v1] Innovations'],
    operationId: 'v1-innovation-pdf-export',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: { description: 'Ok.' },
      400: { description: 'Bad request.' }
    }
  }
});
