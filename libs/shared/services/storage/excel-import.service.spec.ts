import * as ExcelJS from 'exceljs';
import { requiredSectionsAndQuestions } from '../../schemas/innovation-record';
import { SchemaModel } from '../../models/schema-engine/schema.model';
import { ExcelImportService } from './excel-import.service';

describe('ExcelImportService addQuestions handling', () => {
  beforeAll(() => requiredSectionsAndQuestions.clear());

  it('imports parent checkbox selections without dynamic child answers', () => {
    const schema = {
      sections: [
        {
          id: 'SECTION',
          title: 'Section',
          subSections: [
            {
              id: 'SUBSECTION',
              title: 'Subsection',
              steps: [
                {
                  questions: [
                    {
                      id: 'standards',
                      dataType: 'checkbox-array',
                      checkboxAnswerId: 'type',
                      label: 'Standards',
                      items: [{ id: 'OPTION', label: 'Option' }],
                      addQuestions: [
                        {
                          id: 'hasMet',
                          dataType: 'radio-group',
                          label: 'Status',
                          items: [{ id: 'YES', label: 'Yes' }]
                        },
                        {
                          id: 'certifications',
                          dataType: 'input-array',
                          label: 'Numbers',
                          items: [{ id: 'GMDN', label: 'GMDN' }]
                        }
                      ]
                    },
                    {
                      id: 'hasWebsite',
                      dataType: 'radio-group',
                      label: 'Website?',
                      items: [
                        {
                          id: 'YES',
                          label: 'Yes',
                          conditional: { id: 'websiteUrl', dataType: 'text', label: 'Website URL' }
                        },
                        { id: 'NO', label: 'No' }
                      ]
                    },
                    {
                      id: 'source',
                      dataType: 'radio-group',
                      label: 'Source',
                      items: [{ id: 'SOURCE_OPTION', label: 'Source option' }]
                    },
                    {
                      id: 'dependent',
                      dataType: 'radio-group',
                      label: 'Dependent',
                      items: [{ itemsFromAnswer: 'source' }]
                    }
                  ]
                },
                {
                  condition: { id: 'hasWebsite', options: ['YES'] },
                  questions: [{ id: 'conditionalStep', dataType: 'text', label: 'Conditional step' }]
                }
              ]
            }
          ]
        }
      ]
    };
    const schemaModel = new SchemaModel(schema);
    expect(schemaModel.runRules().errors).toEqual([]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Innovation Record');
    const row = sheet.addRow(['', 'Option', 'Selected', '', '', 'OPTION']);
    sheet.addRow(['', 'Website?', 'Yes', '', '', 'hasWebsite', 'YES']);
    sheet.addRow(['', 'Website URL', 'https://example.com', '', '', 'websiteUrl']);
    sheet.addRow(['', 'Conditional step', 'step value', '', '', 'conditionalStep']);
    sheet.addRow(['', 'Source', 'Source option', '', '', 'source']);
    sheet.addRow(['', 'Dependent', 'Source option', '', '', 'dependent']);

    const result = new ExcelImportService().parseWorkbook(workbook, schemaModel.schema, schemaModel);

    expect(row.getCell(3).value).toBe('Selected');
    expect(result.sections[0]?.rawPayload).toEqual({
      standards: [{ type: 'OPTION' }],
      hasWebsite: 'YES',
      websiteUrl: 'https://example.com',
      conditionalStep: 'step value',
      source: 'SOURCE_OPTION',
      dependent: 'SOURCE_OPTION'
    });
  });
});
