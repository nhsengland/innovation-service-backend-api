import type { HttpRequest } from '@azure/functions';

import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';

import PdfMake from 'pdfmake/build/pdfmake';
import PdfFonts from 'pdfmake/build/vfs_fonts';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { type BodyType, BodySchema, ParamsType, ParamsSchema } from './validation.schemas';
import type { InnovationExportSectionAnswerType, InnovationExportSectionItemType, InnovationExportSectionType } from '../_types/innovation.types';
import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';
class PostInnovationPDFExport {

 
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const innovationService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);
      
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      
      const innovation = await innovationService.getInnovationInfo(params.innovationId, {});

      const documentDefinition = {
        header: (current: number) => {
          if (current > 1) {
            return {
              columns: [{
                text: 'Innovation Record',
                style: 'dimmed',
                margin: [10, 10, 10, 10],
                alignment: 'right',
                italic: true,
              }],
            };
          } else return;
        },
        footer: (current: number, total: number) => {
          if (current > 1) {
            return {
              columns: [
                {
                  text: `${current} of ${total}`,
                  style: 'footer',
                  alignment: 'right',
                  margin: [0, 0, 10, 10],
                },
              ]
            };
          } else return;
        },
        content: [
          {
            text: innovation.name,
            style: 'documentTitle',
            pageBreak: 'after',
          },
          { 
            toc: {
              title: { text: 'INDEX', style: 'header' },
              numberStyle: { bold: true }
            }
          },
        ],
        styles: {
          dimmed: {
            fontSize: 10,
            color: '#999999',
            italic: true,
          },
          documentTitle: {
            fontSize: 26,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20],
          },
          header: {
            fontSize: 20,
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
            fontSize: 10
          },
          question: {
            fontSize: 12,
            bold: true,
            italics: true,
          },
          footer: {
            fontSize: 10,
            color: '#999999',
            italics: true,           
          },
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
          pageBreak: 'before',
        } as any);

        entry.sections.forEach((section: InnovationExportSectionItemType ) => {
          documentDefinition.content.push({
            text: section.section as any,
            style: 'subheader',
            margin: [0, 10],
          } as any);

          section.answers.forEach((answer: InnovationExportSectionAnswerType) => {
            documentDefinition.content.push({
              text: answer.label,
              style: 'question',
              margin: [0, 5],
            } as any);

            const answers = answer.value.split('\n');

            if (answers.length > 1) {
              documentDefinition.content.push({
                ul: answers,
                style: 'small',
                margin: [5, 2],
              } as any);
            }  else {
              documentDefinition.content.push({
                text: answers[0] === 'undefined' ? '-' : answers[0] === '' ? '-' : answers[0],
                style: 'small',
                margin: [5, 2],
              } as any);
            }

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