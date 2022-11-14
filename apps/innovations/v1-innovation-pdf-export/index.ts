//import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { HttpRequest } from '@azure/functions';

//import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
//import { BodySchema, BodyType } from './validation.schemas';

import PdfMake from 'pdfmake/build/pdfmake';
import PdfFonts from 'pdfmake/build/vfs_fonts';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { type BodyType, BodySchema } from './validation.schemas';
import type { InnovationExportSectionAnswerType, InnovationExportSectionItemType, InnovationExportSectionType } from '../_types/innovation.types';
//import { JwtDecoder } from '@innovations/shared/decorators';

class PostInnovationPDFExport {

 
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);


      const documentDefinition = {
        content: [
          {
            text: body[0]?.sections[0],
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
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true
          },
          subheader: {
            fontSize: 15,
            bold: true
          },
          quote: {
            italics: true
          },
          small: {
            fontSize: 8
          }
        }
      }

      body.forEach((entry: {title: string, sections: InnovationExportSectionType[]}) => {
        documentDefinition.content.push({
          text: entry.title || '',
          style: 'header',
          tocItem: true,
          tocStyle: { italics: true },
          tocMargin: [0, 10, 0, 0],
          tocNumberStyle: { italics: true, decoration: 'underline' },
          pageBreak: 'after',
        } as any);

        entry.sections.forEach((section: InnovationExportSectionItemType ) => {
          documentDefinition.content.push({
            text: section.section as any,
            style: 'subheader',
          } as any);

          section.answers.forEach((answer: InnovationExportSectionAnswerType) => {
            documentDefinition.content.push({
              text: answer.label,
              style: 'small',
            } as any);

            documentDefinition.content.push({
              text: answer.value,
              style: 'quote',
            } as any);

          });
        });
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