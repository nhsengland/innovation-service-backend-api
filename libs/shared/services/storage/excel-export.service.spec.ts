import { ExcelExportService } from './excel-export.service';

describe('ExcelExportService', () => {
  it('does not render a condition notice for a step containing only unsupported questions', () => {
    const schema = {
      sections: [
        {
          title: 'Deployment',
          subSections: [
            {
              title: 'Deployment',
              steps: [
                {
                  questions: [
                    {
                      id: 'isDeployed',
                      dataType: 'radio-group',
                      label: 'Has your innovation been deployed?',
                      items: [{ id: 'YES', label: 'Yes' }]
                    }
                  ]
                },
                {
                  condition: { id: 'isDeployed', options: ['YES'] },
                  questions: [
                    {
                      id: 'deploymentPlans',
                      dataType: 'fields-group',
                      label: 'Where have you deployed your innovation?',
                      field: { id: 'organisation', dataType: 'text', label: 'Organisation' },
                      addNewLabel: 'Add another'
                    }
                  ]
                },
                {
                  condition: { id: 'isDeployed', options: ['YES'] },
                  questions: [
                    {
                      id: 'commercialBasis',
                      dataType: 'textarea',
                      label: 'What was the commercial basis for deployment?'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const workbook = new ExcelExportService().generateTemplateWorkbook(schema);
    const labels = workbook
      .getWorksheet('Innovation Record')!
      .getColumn(2)
      .values.filter(value => typeof value === 'string') as string[];

    expect(labels.filter(label => label.includes('CONDITIONAL SECTION'))).toHaveLength(1);
    expect(labels).toContain('What was the commercial basis for deployment?');
  });
});
