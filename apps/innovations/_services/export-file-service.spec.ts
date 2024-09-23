 
import { container } from '../_config';

import { InnovationSectionStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { DomainContextType } from '@innovations/shared/types';
import { randAbbreviation, randCompanyName, randUuid } from '@ngneat/falso';
import { fail } from 'assert';
import { cloneDeep } from 'lodash';
import type { ExportFileService } from './export-file-service';
import SYMBOLS from './symbols';

describe('Export File Service Suite', () => {
  const sut = container.get<ExportFileService>(SYMBOLS.ExportFileService);
  const context: DomainContextType = {
    currentRole: {
      id: randUuid(),
      role: ServiceRoleEnum.INNOVATOR
    },
    id: randUuid(),
    identityId: randUuid(),
    organisation: {
      acronym: randAbbreviation(),
      id: randUuid(),
      name: randCompanyName()
    }
  };

  describe('create', () => {
    describe.skip('pdf', () => {
      it('should create the pdf file', async () => {
        fail('todo');
      });
    });

    describe('csv', () => {
      it('should create a csv file', async () => {
        const csv = await sut.create(
          context,
          'csv',
          'innovation name',
          {
            sections: [
              {
                title: 'title 1',
                sections: [
                  {
                    section: 'section 1',
                    status: InnovationSectionStatusEnum.SUBMITTED,
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
                    status: InnovationSectionStatusEnum.DRAFT,
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
            startSectionIndex: 1
          },
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
          context,
          'csv',
          'innovation name',
          {
            sections: [
              {
                title: 'title 1',
                sections: [
                  {
                    section: 'section 1',
                    status: InnovationSectionStatusEnum.SUBMITTED,
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
                    status: InnovationSectionStatusEnum.DRAFT,
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
            startSectionIndex: 1
          },
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

      // NOTE: will leave the test here in case, in the future we want to differentiate a DRAFT
      it.skip('should filter data if context is ACCESSOR', async () => {
        const user = cloneDeep(context) as any;
        user.currentRole.role = ServiceRoleEnum.ACCESSOR;
        const csv = await sut.create(
          user,
          'csv',
          'innovation name',
          {
            sections: [
              {
                title: 'title 1',
                sections: [
                  {
                    section: 'section 1',
                    status: InnovationSectionStatusEnum.SUBMITTED,
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
                    status: InnovationSectionStatusEnum.DRAFT,
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
            startSectionIndex: 1
          },
          { withIndex: false }
        );
        expect(csv).toStrictEqual(
          [
            'Section,Subsection,Question,Answer',
            'title 1,section 1,question 1,value 1',
            'title 1,section 1,question 2,value 2',
            'title 1,section 2,This section is in draft and will not be visible until it is resubmitted.,This section is in draft and will not be visible until it is resubmitted.'
          ].join('\n') + '\n'
        );
      });
    });
  });
});
