import type { HttpRequest } from '@azure/functions';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { type BodyType, BodySchema, ParamsType, ParamsSchema } from './validation.schemas';
import { container } from '../_config';
import { PDFServiceSymbol, PDFServiceType } from '../_services/interfaces';
import { JwtDecoder } from '@innovations/shared/decorators';
import { AuthorizationServiceSymbol, AuthorizationServiceType, DomainServiceSymbol, DomainServiceType } from '@innovations/shared/services';
import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
class PostInnovationPDFExport {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
      const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
      const pdfService = container.get<PDFServiceType>(PDFServiceSymbol);

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      
      const auth = await authorizationService.validate(context.auth.user.identityId)
        .checkInnovatorType()
        .checkAccessorType()
        .verify();

      const requestUser =  auth.getUserInfo();

      const innovation = await domainService.innovations.getInnovationInfo(params.innovationId);

      if (!innovation) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
      }

      const documentDefinition = pdfService.buildDocumentHeaderDefinition(innovation.name, body);

      const pdf = await pdfService.generatePDF(requestUser , params.innovationId ,documentDefinition);

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

export default PostInnovationPDFExport.httpTrigger;


