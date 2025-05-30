import { inject, injectable } from 'inversify';

import SHARED_SYMBOLS from '../symbols';
import { IRSchemaService } from './ir-schema.service';
import { addFormElements, generateWordDocument } from '../../helpers/docx.helper';

@injectable()
export class IRExportService {
  constructor(@inject(SHARED_SYMBOLS.IRSchemaService) private readonly irSchemaService: IRSchemaService) {}

  /**
   * Generates a docx file for the innovation record.
   * This will retrieve the schema from the IRSchemaService
   * and use it to create the docx file.
   */
  async generateDocx(): Promise<Buffer> {
    try {
      // 1. Retrieve JSON schema from database
      const schema = await this.irSchemaService.getSchema();

      // 2. Generate Word document
      const documentBuffer = await generateWordDocument(schema.model.schema);

      // 3. Process document to add checkboxes and other form elements
      const finalBuffer = await addFormElements(documentBuffer);

      return finalBuffer;
    } catch (error) {
      console.error('Error processing document:', error instanceof Error ? error.message : error);
      console.error(error);
      throw error;
    }
  }
}
