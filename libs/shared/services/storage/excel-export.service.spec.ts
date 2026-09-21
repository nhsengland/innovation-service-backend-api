import type * as ExcelJS from 'exceljs';
import { ExcelExportService } from './excel-export.service';

describe('ExcelExportService addQuestions handling', () => {
  it('does not render dynamic addQuestions children', () => {
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
                      label: 'Standards',
                      items: [
                        {
                          id: 'OPTION',
                          label: 'Option',
                          conditional: { id: 'conditionalChild', dataType: 'text', label: 'Conditional child' }
                        }
                      ],
                      addQuestions: [
                        { id: 'hasMet', dataType: 'radio-group', label: 'Status', items: [{ id: 'YES', label: 'Yes' }] }
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
                          conditional: { id: 'websiteUrl', dataType: 'text', label: 'Conditional child' }
                        }
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
                  condition: { id: 'standards', options: ['OPTION'] },
                  questions: [{ id: 'conditionalStep', dataType: 'text', label: 'Conditional step question' }]
                }
              ]
            }
          ]
        }
      ]
    };

    const workbook = new ExcelExportService().generateTemplateWorkbook(schema);
    const sheet = workbook.getWorksheet('Innovation Record') as ExcelJS.Worksheet;
    const referenceData = workbook.getWorksheet('ReferenceData') as ExcelJS.Worksheet;
    const labels = sheet.getColumn(2).values.map(value => String(value ?? ''));
    const ids = sheet.getColumn(6).values.map(value => String(value ?? ''));

    expect(labels.some(label => label.includes('Standards'))).toBe(true);
    expect(labels.some(label => label.includes('Status'))).toBe(false);
    expect(labels.some(label => label.includes('Conditional child'))).toBe(true);
    expect(labels.some(label => label.includes('Conditional step question'))).toBe(true);
    expect(labels.some(label => label.includes('CONDITIONAL SECTION'))).toBe(true);
    expect(labels.some(label => label.includes('Dependent'))).toBe(true);
    expect(referenceData.getCell('C1').value).toBe('Source option');
    expect(ids).not.toContain('hasMet');
  });
});
