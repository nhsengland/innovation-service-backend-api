/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { fail } from 'assert';
import type { ExportFileService } from './export-file-service';
import SYMBOLS from './symbols';

describe('Export File Service Suite', () => {
  const sut = container.get<ExportFileService>(SYMBOLS.ExportFileService);

  describe('create', () => {
    describe.skip('pdf', () => {
      it('should create the pdf file', async () => {
        fail('todo');
      });
    });

    describe('csv', () => {
      it('should create a csv file', async () => {
        const csv = await sut.create(
          'csv',
          'innovation name',
          [
            {
              title: 'title 1',
              sections: [
                {
                  section: 'section 1',
                  answers: [
                    {
                      label: 'question 1',
                      value: 'value 1'
                    },
                    {
                      label: 'question 2',
                      value: 'value 2'
                    }
                  ]
                },
                {
                  section: 'section 2',
                  answers: [
                    {
                      label: 'question 3',
                      value: 'value 3'
                    }
                  ]
                }
              ]
            }
          ],
          { withIndex: false }
        );
        expect(csv).toStrictEqual(
          [
            'Section,Subsection,Question,Answer',
            'title 1,section 1,question 1,value 1',
            'title 1,section 1,question 2,value 2',
            'title 1,section 2,question 3,value 3'
          ].join('\n') + '\n'
        );
      });

      it('should add numbers if withIndex', async () => {
        const csv = await sut.create(
          'csv',
          'innovation name',
          [
            {
              title: 'title 1',
              sections: [
                {
                  section: 'section 1',
                  answers: [
                    {
                      label: 'question 1',
                      value: 'value 1'
                    },
                    {
                      label: 'question 2',
                      value: 'value 2'
                    }
                  ]
                },
                {
                  section: 'section 2',
                  answers: [
                    {
                      label: 'question 3',
                      value: 'value 3'
                    }
                  ]
                }
              ]
            }
          ],
          { withIndex: true }
        );
        expect(csv).toStrictEqual(
          [
            'Section,Subsection,Question,Answer',
            '1 title 1,1.1 section 1,question 1,value 1',
            '1 title 1,1.1 section 1,question 2,value 2',
            '1 title 1,1.2 section 2,question 3,value 3'
          ].join('\n') + '\n'
        );
      });
    });
  });
});
