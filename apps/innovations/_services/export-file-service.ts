import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { csvToString } from '@innovations/shared/helpers/csv.helper';
import { injectable } from 'inversify';
import PdfPrinter from 'pdfmake';
import PdfMake from 'pdfmake/build/pdfmake';
import PdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import {
  buildDocumentFooterDefinition,
  buildDocumentHeaderDefinition,
  buildDocumentStylesDefinition,
  buildDocumentTOCDefinition
} from '../_helpers/innovation.pdf.styles';
import type { InnovationAllSectionsType, InnovationExportSectionAnswerType } from '../_types/innovation.types';

import { JoiHelper } from '@innovations/shared/helpers';
import {
  DomainContextType,
  isAccessorDomainContextType,
  isAssessmentDomainContextType
} from '@innovations/shared/types';
import Joi from 'joi';
import { BaseService } from './base.service';

export type DocumentExportInboundDataType = { sections: InnovationAllSectionsType; startSectionIndex: number };
export const DocumentExportBodySchema = Joi.object<DocumentExportInboundDataType>({
  sections: Joi.array()
    .items({
      sections: Joi.array()
        .items(
          Joi.object({
            section: JoiHelper.AppCustomJoi().string().required(),
            status: JoiHelper.AppCustomJoi()
              .string()
              .valid(...Object.values(InnovationSectionStatusEnum), 'UNKNOWN')
              .required(),
            answers: Joi.array()
              .items(
                Joi.object({
                  label: JoiHelper.AppCustomJoi().string().required(),
                  value: JoiHelper.AppCustomJoi().string().allow(null, '').required()
                })
              )
              .required()
          })
        )
        .required(),
      title: JoiHelper.AppCustomJoi().string().required()
    })
    .required(),
  startSectionIndex: Joi.number().required()
});

@injectable()
export class ExportFileService extends BaseService {
  constructor() {
    super();
  }

  private handlers = {
    pdf: this.createPdf.bind(this),
    csv: this.createCsv.bind(this)
  };

  async create<T extends keyof ExportFileService['handlers']>(
    domainContext: DomainContextType,
    type: T,
    innovation: { name: string; uniqueId: string },
    body: DocumentExportInboundDataType,
    options?: Parameters<ExportFileService['handlers'][T]>[2]
  ): Promise<ReturnType<ExportFileService['handlers'][T]>> {
    // Add draft note to QA/A/NA on the pdf version
    if (
      type === 'pdf' &&
      (isAccessorDomainContextType(domainContext) || isAssessmentDomainContextType(domainContext))
    ) {
      body.sections.forEach(section => {
        section.sections.forEach(subsection => {
          if (subsection.status === 'DRAFT') {
            subsection.answers.unshift({
              label: '',
              value: 'This section is in draft. This is the last version submitted by the innovator.'
            });
          }
        });
      });
    }
    return this.handlers[type](innovation, body, options) as any;
  }

  //#region Handlers
  /**
   * creates the pdf file
   * @param innovationName innovation name
   * @param body questions and answers
   * @returns the pdf file
   */
  private createPdf(
    innovation: { name: string; uniqueId: string },
    body: DocumentExportInboundDataType
  ): Promise<Buffer> {
    const definition = this.buildPdfDocumentHeaderDefinition(innovation, body);
    return this.createPDFFromDefinition(definition);
  }

  /**
   * creates the csv file
   * @param innovationName innovation name
   * @param body questions and answers
   * @returns the csv file
   */
  private createCsv(
    innovation: { name: string; uniqueId: string },
    body: DocumentExportInboundDataType,
    options?: { withIndex?: boolean }
  ): string {
    // Add headers
    const header = ['Section', 'Subsection', 'Question', 'Answer'];
    const id = ['Innovation Details', 'Innovation Details', 'Innovation ID', innovation.uniqueId];
    const data = body.sections.flatMap((section, sectionIndex) =>
      section.sections.flatMap((subsection, subsectionIndex) =>
        subsection.answers.map(question => [
          options?.withIndex ? `${sectionIndex + 1} ${section.title}` : `${section.title}`,
          options?.withIndex
            ? `${sectionIndex + 1}.${subsectionIndex + 1} ${subsection.section}`
            : `${subsection.section}`,
          question.label ? `${question.label}` : `${question.value}`,
          `${question.value}`
        ])
      )
    );

    return csvToString([header, id, ...data]);
  }
  //#endregion

  //#region PDF helpers
  private async createPDFFromDefinition(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    PdfMake.vfs = PdfFonts.vfs;

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
      doc.on('data', chunk => {
        chunks.push(chunk);
      });
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  private buildPdfDocumentHeaderDefinition(
    innovation: { name: string; uniqueId: string },
    body: DocumentExportInboundDataType
  ): TDocumentDefinitions {
    const documentDefinition = {
      header: buildDocumentHeaderDefinition(),
      footer: buildDocumentFooterDefinition(),
      content: buildDocumentTOCDefinition(innovation),
      styles: buildDocumentStylesDefinition()
    };

    let sectionNumber = body.startSectionIndex;
    body.sections.forEach(entry => {
      documentDefinition.content.push({
        text: `${sectionNumber}. ${entry.title}`,
        style: 'sectionTitle',
        tocItem: true,
        tocStyle: { italics: true },
        tocMargin: [0, 10, 0, 0],
        tocNumberStyle: { italics: true, decoration: 'underline' },
        pageBreak: 'before'
      } as any);

      let subSectionNumber = 1;

      entry.sections.forEach(section => {
        documentDefinition.content.push({
          text: `${sectionNumber}.${subSectionNumber} ${section.section}`,
          style: 'subheader',
          margin: [5, 20]
        } as any);

        let questionNumber = 1;
        section.answers.forEach((answer: InnovationExportSectionAnswerType) => {
          // Don't add the header if no label for the question
          if (answer.label) {
            documentDefinition.content.push({
              text: `${sectionNumber}.${subSectionNumber}.${questionNumber} ${answer.label}`,
              style: 'question',
              margin: [10, 10]
            } as any);
          }

          const answers = answer.value.split('\n');

          if (answers.length > 1) {
            documentDefinition.content.push({
              ul: answers,
              style: 'answer',
              margin: [15, 2]
            } as any);
          } else {
            documentDefinition.content.push({
              text: answers[0] === 'undefined' ? '-' : answers[0] === '' ? '-' : answers[0],
              style: 'answer',
              margin: [15, 2]
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
  //#endregion
}
