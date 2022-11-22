import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import PdfPrinter from 'pdfmake';
import PdfMake from 'pdfmake/build/pdfmake';
import PdfFonts from 'pdfmake/build/vfs_fonts';
import type { InnovationAllSectionsType, InnovationExportSectionAnswerType, InnovationExportSectionItemType, InnovationExportSectionType } from '../_types/innovation.types';
import { buildDocumentHeaderDefinition, buildDocumentFooterDefinition, buildDocumentTOCDefinition, buildDocumentStylesDefinition } from '../_helpers/innovation.pdf.styles'
import { injectable } from 'inversify';
import type { DomainUserInfoType } from '@innovations/shared/types';
import { BaseService } from './base.service';
import { InnovationExportRequestEntity } from '@innovations/shared/entities';
import { InnovationErrorsEnum, NotFoundError } from '@innovations/shared/errors';
import { InnovationExportRequestStatusEnum } from '@innovations/shared/enums';

@injectable()
export class PDFService  extends BaseService{

  constructor() {
    super();
  }

  async generatePDF(requestUser: DomainUserInfoType, innovationId: string ,docDefinition: TDocumentDefinitions): Promise<unknown> {

    if (requestUser.type === 'ACCESSOR') {
      const request = await this.sqlConnection.createQueryBuilder(InnovationExportRequestEntity, 'request')
        .innerJoinAndSelect('request.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId })
        .andWhere('request.organisation_unit_id = :organisationUnitId', { organisationUnitId: requestUser.organisations[0]?.organisationUnits[0]?.id })
        .andWhere('request.status = :status', { status: 'APPROVED' })
        .getOne();
      
      if (!request) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND);
      }
      
      if (request.status === InnovationExportRequestStatusEnum.EXPIRED) {
        throw new NotFoundError(InnovationErrorsEnum.INNOVATION_RECORD_EXPORT_REQUEST_EXPIRED);
      }
    }

    PdfMake.vfs = PdfFonts.pdfMake.vfs;

    const fontDescriptors = { 
        Roboto: {
            normal: '_fonts/Frutiger-LT-Std-55-Roman.ttf',
            bold: '_fonts/Frutiger-LT-Std-65-Bold.ttf',
            italics: '_fonts/Frutiger-LT-Std-55-Roman.ttf',
            bolditalics: '_fonts/Frutiger-LT-Std-65-Bold.ttf'
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

  buildDocumentHeaderDefinition(innovationName: string, body: InnovationAllSectionsType): TDocumentDefinitions {

    const documentDefinition = {
      header: buildDocumentHeaderDefinition(),
      footer: buildDocumentFooterDefinition(),
      content: buildDocumentTOCDefinition(innovationName),
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

    return documentDefinition;
  }
}