import { inject, injectable } from 'inversify';
import * as ExcelJS from 'exceljs';

import { InnovationErrorsEnum, UnprocessableEntityError, BadRequestError } from '@innovations/shared/errors';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { DomainContextType } from '@innovations/shared/types';
import type { IRSchemaService } from '@innovations/shared/services';
import type { ExcelExportService } from '@innovations/shared/services/storage/excel-export.service';
import type { ExcelImportService } from '@innovations/shared/services/storage/excel-import.service';

import type { InnovationsService } from './innovations.service';
import type { InnovationSectionsService } from './innovation-sections.service';
import SYMBOLS from './symbols';
import { getSmartMockPayload } from '../../../libs/shared/services/storage/excel-schema-helpers';

@injectable()
export class ExcelInnovationService {
  constructor(
    @inject(SHARED_SYMBOLS.IRSchemaService) private irSchemaService: IRSchemaService,
    @inject(SHARED_SYMBOLS.ExcelExportService) private excelExportService: ExcelExportService,
    @inject(SHARED_SYMBOLS.ExcelImportService) private excelImportService: ExcelImportService,
    @inject(SYMBOLS.InnovationsService) private innovationsService: InnovationsService,
    @inject(SYMBOLS.InnovationSectionsService) private sectionsService: InnovationSectionsService
  ) {}

  /**
   * Generates a Buffer for an empty Excel template based on the current schema.
   */
  async generateTemplate(): Promise<Buffer> {
    const schema = await this.irSchemaService.getSchema();
    const workbook = this.excelExportService.generateTemplateWorkbook(schema.model.schema, undefined, schema.version);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  /**
   * Generates a Buffer for a pre-filled Excel file based on a JSON payload.
   */
  async generateExport(payload: any): Promise<Buffer> {
    const schema = await this.irSchemaService.getSchema();
    const workbook = this.excelExportService.generateTemplateWorkbook(schema.model.schema, payload, schema.version);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  /**
   * Parses an uploaded Excel file (base64) and creates a new Innovation + its sections.
   */
  async importInnovation(domainContext: DomainContextType, base64Xlsx: string): Promise<{ id: string; validationIssues: Record<string, string[]>; emptySections: string[] }> {
    const buffer = Buffer.from(base64Xlsx, 'base64');
    const workbook = new ExcelJS.Workbook();
    
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (err) {
      console.error('[ExcelImport] Failed to load Excel workbook:', err);
      throw new BadRequestError(InnovationErrorsEnum.INNOVATION_RECORD_INVALID_EXCEL_FILE);
    }

    const schema = await this.irSchemaService.getSchema();
    console.log(`[ExcelImport] Starting import with DB schema version: ${schema.version}`);

    const allValidationIssues: Record<string, string[]> = {};
    
    // --- SCHEMA VERSION CHECK ---
    const extractedVersion = this.excelImportService.extractSchemaVersion(workbook);
    console.log(`[ExcelImport] Uploaded file schema version: ${extractedVersion || 'Unknown'}`);
    
    if (!extractedVersion || extractedVersion < schema.version) {
      allValidationIssues['GLOBAL_WARNING'] = [
        `Warning: You uploaded an outdated Excel template (Version ${extractedVersion || 'Unknown'}). Some fields may not have imported correctly because the system rules have been updated.`
      ];
      console.warn(`[ExcelImport] Schema drift detected! Added global warning.`);
    }

    // 1. Extract Registration (INNOVATION_DESCRIPTION) first to create the record.
    const { payload: regPayload, validationIssues } = this.excelImportService.parseRegistrationPayload(
      workbook,
      schema.model.schema,
      schema.model
    );

    console.log('[ExcelImport] Registration Payload Extracted:', JSON.stringify(regPayload, null, 2));
    if (validationIssues.length > 0) {
      allValidationIssues['INNOVATION_DESCRIPTION'] = validationIssues;
      console.warn('[ExcelImport] Registration Validation Issues:', validationIssues);
    }

    if (!regPayload['name'] || !regPayload['description'] || !regPayload['officeLocation']) {
      console.error('[ExcelImport] Missing required fields. Name:', regPayload['name'], 'Description:', regPayload['description'], 'Location:', regPayload['officeLocation']);
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_INFO_EMPTY_INPUT);
    }

    // 2. Create the Innovation (returns the new ID)
    const { id: innovationId } = await this.innovationsService.createInnovation(
      domainContext,
      regPayload as any
    );

    // 3. Extract all sections and perform updates for everything else
    const importResult = this.excelImportService.parseWorkbook(workbook, schema.model.schema, schema.model);
    
    for (const section of importResult.sections) {
      if (section.validationIssues && section.validationIssues.length > 0) {
        allValidationIssues[section.sectionKey] = section.validationIssues;
      }
    }

    // Identify missing required fields in empty sections
    for (const sectionKey of importResult.emptySections) {
      this.validateRequiredFieldsInEmptySection(sectionKey, schema.model, allValidationIssues);
    }

    await this.saveImportedSections(domainContext, innovationId, importResult.sections);

    return { id: innovationId, validationIssues: allValidationIssues, emptySections: importResult.emptySections };
  }

  /**
   * Parses a raw JSON payload and creates a new Innovation + its sections.
   */
  async importInnovationFromJson(domainContext: DomainContextType, jsonPayload: Record<string, Record<string, any>>): Promise<{ id: string; validationIssues: Record<string, string[]>; emptySections: string[] }> {
    const schema = await this.irSchemaService.getSchema();
    console.log(`[JsonImport] Starting import with schema version: ${schema.version}`);

    const allValidationIssues: Record<string, string[]> = {};
    const emptySections: string[] = [];

    // 1. Extract Registration (INNOVATION_DESCRIPTION) first to create the record.
    const rawRegPayload = jsonPayload['INNOVATION_DESCRIPTION'] || {};
    
    const regCalculatedFields = schema.model.getCalculatedFields('INNOVATION_DESCRIPTION', rawRegPayload);
    const regPayload = { ...rawRegPayload, ...regCalculatedFields };

    const validationIssues: string[] = [];
    try {
        const descSection = schema.model.schema.sections
            .flatMap((s: any) => s.subSections)
            .find((ss: any) => ss.id === 'INNOVATION_DESCRIPTION');
if (!descSection) throw new Error('INNOVATION_DESCRIPTION section not found in schema.');

// Smart mock payload for registration
const mockPayload = getSmartMockPayload(descSection, rawRegPayload);

const joiSchema = schema.model.getSubSectionPayloadValidation('INNOVATION_DESCRIPTION', mockPayload);
const { error } = joiSchema.validate(rawRegPayload, { abortEarly: false, allowUnknown: true });
if (error) {
    error.details.forEach(d => validationIssues.push(d.message));
}

    } catch (err: any) {
        validationIssues.push(`Validation error: ${err?.message}`);
    }

    console.log('[JsonImport] Registration Payload Extracted:', JSON.stringify(regPayload, null, 2));
    if (validationIssues.length > 0) {
      allValidationIssues['INNOVATION_DESCRIPTION'] = validationIssues;
      console.warn('[JsonImport] Registration Validation Issues:', validationIssues);
    }

    if (!regPayload['name'] || !regPayload['description'] || !regPayload['officeLocation']) {
      console.error('[JsonImport] Missing required fields. Name:', regPayload['name'], 'Description:', regPayload['description'], 'Location:', regPayload['officeLocation']);
      throw new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_INFO_EMPTY_INPUT);
    }

    // 2. Create the Innovation (returns the new ID)
    const { id: innovationId } = await this.innovationsService.createInnovation(
      domainContext,
      regPayload as any
    );

    // 3. Extract all sections and perform updates for everything else
    const sections: any[] = [];
    for (const section of schema.model.schema.sections) {
      for (const subSection of section.subSections) {
        const sectionKey = subSection.id as string;
        const rawPayload = jsonPayload[sectionKey] || {};

        if (Object.keys(rawPayload).length === 0) {
            emptySections.push(sectionKey);
            this.validateRequiredFieldsInEmptySection(sectionKey, schema.model, allValidationIssues);
            continue;
        }

        const secValidationIssues: string[] = [];
        try {
            // Smart mock payload for JSON subsections
            const mockPayload = getSmartMockPayload(subSection, rawPayload);

            const joiSchema = schema.model.getSubSectionPayloadValidation(sectionKey, mockPayload);

            const { error } = joiSchema.validate(rawPayload, { abortEarly: false, allowUnknown: true });
            if (error) error.details.forEach(d => secValidationIssues.push(d.message));
        } catch (err: any) {
            secValidationIssues.push(`Schema validation error: ${err?.message}`);
        }

        if (secValidationIssues.length > 0) {
            allValidationIssues[sectionKey] = secValidationIssues;
        }

        const calculatedFields = schema.model.getCalculatedFields(sectionKey, rawPayload);
        const finalPayload = { ...rawPayload, ...calculatedFields };

        sections.push({ sectionKey, rawPayload, calculatedFields, finalPayload, validationIssues: secValidationIssues });
      }
    }
    
    await this.saveImportedSections(domainContext, innovationId, sections);

    return { id: innovationId, validationIssues: allValidationIssues, emptySections };
  }

  /**
   * Performs validation on an empty section to identify missing required fields.
   * 
   * This logic is used when a section is completely missing from the import (Excel or JSON).
   * Since our validation engine is payload-driven, it won't report missing fields unless
   * we provide a mock payload containing the field keys.
   * 
   * @example
   * // If 'UNDERSTANDING_OF_NEEDS' is empty but requires 'problemsTackled':
   * validateRequiredFieldsInEmptySection('UNDERSTANDING_OF_NEEDS', schemaModel, allValidationIssues);
   * // Result: allValidationIssues['UNDERSTANDING_OF_NEEDS'] = ["'problemsTackled' is required"]
   * 
   * @param sectionKey - The unique ID of the section to validate.
   * @param schemaModel - The SchemaModel instance containing business rules.
   * @param allValidationIssues - The accumulator object for reporting errors.
   */
  private validateRequiredFieldsInEmptySection(
    sectionKey: string,
    schemaModel: any,
    allValidationIssues: Record<string, string[]>
  ): void {
    try {
      const subSection = schemaModel.schema.sections
          .flatMap((s: any) => s.subSections)
          .find((ss: any) => ss.id === sectionKey);

      if (!subSection) return;

      // Smart mock payload for empty section: 
      // Only includes questions from steps without conditions (top-level) when data is empty.
      const mockPayload = getSmartMockPayload(subSection, {});

      const joiSchema = schemaModel.getSubSectionPayloadValidation(sectionKey, mockPayload);
      const { error } = joiSchema.validate({}, { abortEarly: false, allowUnknown: true });

      if (error) {
        allValidationIssues[sectionKey] = error.details.map((d: any) => d.message);
      }
    } catch (err: any) {
      console.error(`[validateRequiredFieldsInEmptySection] Failed to validate section ${sectionKey}:`, err?.message);
      // Silently skip if the validation factory fails for an empty context
    }
  }

  private async saveImportedSections(domainContext: DomainContextType, innovationId: string, sections: any[]): Promise<void> {
    // Process sections sequentially to maintain sanity (though parallel would likely work)
    for (const section of sections) {
      // Even though INNOVATION_DESCRIPTION was used for createInnovation, we MUST update it 
      // here as well because createInnovation only saves a tiny subset of its fields (name, desc, etc).
      // The rest of the fields (categories, areas, careSettings) need to be saved via updateInnovationSectionInfo.
      await this.sectionsService.updateInnovationSectionInfo(
        domainContext,
        innovationId,
        section.sectionKey as any,
        section.finalPayload
      );
    }
  }
}
