//import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { HttpRequest } from '@azure/functions';

//import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import { ParamsSchema, ParamsType } from './validation.schemas';

import PdfMake from 'pdfmake/build/pdfmake';
import PdfFonts from 'pdfmake/build/vfs_fonts';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

class PostInnovationPDFExport {

  //@JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);
  
    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const data = await innovationSectionsService.findAllSections(params.innovationId);


      const documentDefinition = {
        content: [
          {
            text: data.innovation.name,
            style: 'document-title',
            pageBreak: 'after',
          },
          { 
            toc: {
              title: { text: 'INDEX', style: 'header' },
              //textMargin: [0, 0, 0, 0],
              //textStyle: {italics: true},
              numberStyle: { bold: true }
            }
          },
        ]
      }

      data.innovationSections.forEach((entry) => {
        documentDefinition.content.push({
          text: entry.section.section || '',
          style: 'header',
          pageBreak: 'before',
          tocItem: true,
          tocStyle: { italics: true },
          tocMargin: [0, 10, 0, 0],
          tocNumberStyle: { italics: true, decoration: 'underline' },
        } as any);
       });

      
      PdfMake.vfs = PdfFonts.pdfMake.vfs;

      const pdf = await generatePDF(documentDefinition as any);

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


async function generatePDF(docDefinition: TDocumentDefinitions): Promise<unknown> {

  const fontDescriptors = { 
      Roboto: {
          normal: 'fonts/Roboto-Regular.ttf',
          bold: 'fonts/Roboto-Medium.ttf',
          italics: 'fonts/Roboto-Italic.ttf',
          bolditalics: 'fonts/Roboto-MediumItalic.ttf'
      }
  };
  const printer = new PdfPrinter(fontDescriptors);
  const doc = printer.createPdfKitDocument(docDefinition);

  return new Promise(resolve => {
      const chunks: any[] = [];
      doc.end();
      doc.on('data', (chunk) => {
          chunks.push(chunk);
      });
      doc.on('end', () => {
          resolve(Buffer.concat(chunks));
      });    
  });
}