import { mapOpenApi3 as openapi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@innovations/shared/decorators';
import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import {
  AuthorizationServiceSymbol,
  AuthorizationServiceType,
  DomainServiceSymbol,
  DomainServiceType,
} from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { PDFServiceSymbol, PDFServiceType } from '../_services/interfaces';
import { BodySchema, ParamsSchema, ParamsType, type BodyType } from './validation.schemas';
class PostInnovationPDFExport {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    try {
      const authorizationService = container.get<AuthorizationServiceType>(
        AuthorizationServiceSymbol
      );
      const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
      const pdfService = container.get<PDFServiceType>(PDFServiceSymbol);

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .checkInnovatorType()
        .checkAccessorType()
        .verify();

      const domainContext = auth.getContext();

      const innovation = await domainService.innovations.getInnovationInfo(params.innovationId);

      if (!innovation) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
      }

      const documentDefinition = pdfService.buildDocumentHeaderDefinition(innovation.name, body);

      const pdf = await pdfService.generatePDF(
        domainContext,
        params.innovationId,
        documentDefinition
      );

      context.res = {
        body: pdf,
        headers: {
          'Content-Type': 'application/pdf',
        },
      };

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openapi(
  PostInnovationPDFExport.httpTrigger as AzureFunction,
  '/v1/{innovationId}/pdf',
  {
    post: {
      description: 'Generate PDF for an innovation',
      tags: ['[v1] Innovations'],
      operationId: 'v1-innovation-pdf',
      parameters: [
        { in: 'path', name: 'innovationId', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        description: 'The thread details',
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
      responses: {
        200: { description: 'Ok.' },
        400: { description: 'Bad request.' },
      },
    },
  }
);
