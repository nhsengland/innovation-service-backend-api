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
import { buildDocumentHeaderDefinition, buildDocumentFooterDefinition, buildDocumentTOCDefinition, buildDocumentStylesDefinition } from '../_helpers/innovation.pdf.styles'
class PostInnovationPDFExport {

 
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    try {

      const innovationService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);
      
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      
      const innovation = await innovationService.getInnovationInfo(params.innovationId, {});

      const documentDefinition = {
        header: buildDocumentHeaderDefinition(),
        footer: buildDocumentFooterDefinition(),
        content: buildDocumentTOCDefinition(innovation.name),
        styles: buildDocumentStylesDefinition(),
      }

      let sectionNumber = 1;
      body.forEach((entry: {title: string, sections: InnovationExportSectionType[]}) => {

        documentDefinition.content.push({
          text: `${sectionNumber}. ${ entry.title }`,
          style: 'sectionTitle',
          tocItem: true,
          tocStyle: { italics: true },
          tocMargin: [0, 10, 0, 0],
          tocNumberStyle: { italics: true, decoration: 'underline' },
          pageBreak: 'before',
        } as any);

        let subSectionNumber = 1;

        entry.sections.forEach((section: InnovationExportSectionItemType ) => {
          documentDefinition.content.push({
            text: `${sectionNumber}.${subSectionNumber} ${section.section}`,
            style: 'subheader',
            margin: [5, 20],
          } as any);

          let questionNumber = 1;
          section.answers.forEach((answer: InnovationExportSectionAnswerType) => {
            documentDefinition.content.push({
              text: `${sectionNumber}.${subSectionNumber}.${questionNumber} ${answer.label}`,
              style: 'question',
              margin: [10, 10,],
            } as any);

            const answers = answer.value.split('\n');

            if (answers.length > 1) {
              documentDefinition.content.push({
                ul: answers,
                style: 'answer',
                margin: [15, 2],
              } as any);
            }  else {
              documentDefinition.content.push({
                text: answers[0] === 'undefined' ? '-' : answers[0] === '' ? '-' : answers[0],
                style: 'answer',
                margin: [15, 2],
              } as any);
            }

            questionNumber++;
          });
          subSectionNumber++;
        });
        sectionNumber++;
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