/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { InnovationEntity, InnovationSectionEntity } from '@innovations/shared/entities';
import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes, CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { rand, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationSectionsService } from './innovation-sections.service';
import SYMBOLS from './symbols';

describe('Innovation Sections Suite', () => {
  let sut: InnovationSectionsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

  describe('getInnovationSectionsList', () => {
    it('should list all sections as an innovator for his innovation', async () => {
      const sectionsList = await sut.getInnovationSectionsList(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        em
      );

      const actionCount = sectionsList.map(s => s.openTasksCount).reduce((a, b) => a + b, 0);

      expect(sectionsList).toBeDefined();
      expect(actionCount).toEqual(3);
    });

    it('should list all sections as an accessor for an innovation', async () => {
      const sectionsList = await sut.getInnovationSectionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      const actionCount = sectionsList.map(s => s.openTasksCount).reduce((a, b) => a + b, 0);

      expect(sectionsList).toBeDefined();
      expect(actionCount).toEqual(0);
    });
  });

  describe('getInnovationSectionInfo', () => {
    it('should get submitted section info as assessment user', async () => {
      const sectionsList = await sut.getInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        {},
        em
      );

      expect(sectionsList.id).toBeDefined();
    });

    it('should not get draft section info as accessor', async () => {
      await em.update(
        InnovationSectionEntity,
        { id: innovation.sections.INNOVATION_DESCRIPTION.id },
        { status: InnovationSectionStatusEnum.DRAFT }
      );

      const section = await sut.getInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        {},
        em
      );

      expect(section.data).toStrictEqual({});
    });

    it('should not get draft section info as NA', async () => {
      await em.update(
        InnovationSectionEntity,
        { id: innovation.sections.INNOVATION_DESCRIPTION.id },
        { status: InnovationSectionStatusEnum.DRAFT }
      );

      const section = await sut.getInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        {},
        em
      );

      expect(section.data).toStrictEqual({});
    });
  });

  describe('updateInnovationSectionInfo', () => {
    it('should update a section and only change the draft document', async () => {
      const newSummary = randText();

      await sut.updateInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        { summary: newSummary },
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .addSelect("JSON_VALUE(document.document, '$.INNOVATION_DESCRIPTION.summary')", 'documentSummary')
        .addSelect("JSON_VALUE(documentDraft.document, '$.INNOVATION_DESCRIPTION.summary')", 'documentDraftSummary')
        .innerJoin('innovation.document', 'document')
        .innerJoin('innovation_document_draft', 'documentDraft', 'documentDraft.id = innovation.id')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getRawOne();

      expect(dbInnovation.documentSummary).not.toBe(newSummary);
      expect(dbInnovation.documentDraftSummary).toBe(newSummary);
    });

    it('should sync the innovation name across documents and innovation', async () => {
      const newValue = randText();

      await sut.updateInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        { name: newValue },
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select('innovation.name', 'innovationName')
        .addSelect("JSON_VALUE(document.document, '$.INNOVATION_DESCRIPTION.name')", 'documentName')
        .addSelect("JSON_VALUE(documentDraft.document, '$.INNOVATION_DESCRIPTION.name')", 'documentDraftName')
        .innerJoin('innovation.document', 'document')
        .innerJoin('innovation_document_draft', 'documentDraft', 'documentDraft.id = innovation.id')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getRawOne();

      expect(dbInnovation.innovationName).toBe(newValue);
      expect(dbInnovation.documentName).toBe(newValue);
      expect(dbInnovation.documentDraftName).toBe(newValue);
    });
  });

  describe('submitInnovationSection', () => {
    it('should submit a section', async () => {
      await em.update(
        InnovationSectionEntity,
        { id: innovation.sections.INNOVATION_DESCRIPTION.id },
        { status: InnovationSectionStatusEnum.DRAFT }
      );
      const section = await sut.submitInnovationSection(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        em
      );
      // assert
      expect(section.id).toBeDefined();
    });
  });

  describe('createInnovationEvidence', () => {
    it('should create clinical evidence', async () => {
      await sut.createInnovationEvidence(
        { id: scenario.users.johnInnovator.id },
        innovation.id,
        {
          evidenceSubmitType: 'CLINICAL_OR_CARE',
          evidenceType: rand(Object.values(CurrentCatalogTypes.catalogEvidenceType)),
          description: randText(),
          summary: randText()
        },
        em
      );

      // assert assuming if no error is thrown then the test is successful (for now)
    });

    it('should create non-clinical evidence', async () => {
      const allowedEvidenceTypes = CurrentCatalogTypes.catalogEvidenceSubmitType.filter(
        et => et !== 'CLINICAL_OR_CARE'
      );

      await sut.createInnovationEvidence(
        { id: scenario.users.johnInnovator.id },
        innovation.id,
        {
          evidenceSubmitType: rand(allowedEvidenceTypes),
          evidenceType: 'OTHER',
          description: randText(),
          summary: randText()
        },
        em
      );

      // assert assuming if no error is thrown then the test is successful (for now)
    });
  });

  describe('findAllSections', () => {
    it('should return all the sections info', async () => {
      const allSectionsInfo = await sut.findAllSections(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id
      );

      expect(allSectionsInfo).toStrictEqual([
        {
          section: {
            section: innovation.sections.INNOVATION_DESCRIPTION.section,
            status: innovation.sections.INNOVATION_DESCRIPTION.status,
            submittedAt: undefined,
            submittedBy: { displayTag: 'Innovator', name: '[unknown user]' },
            openTasksCount: 3 // John innovation has 4 tasks, 3 open and 1 done
          },
          data: expect.any(Object)
        },
        {
          section: {
            section: 'UNDERSTANDING_OF_NEEDS',
            status: 'NOT_STARTED',
            openTasksCount: 0
          },
          data: expect.any(Object)
        },
        {
          section: {
            section: innovation.sections.EVIDENCE_OF_EFFECTIVENESS.section,
            status: innovation.sections.EVIDENCE_OF_EFFECTIVENESS.status,
            submittedAt: undefined,
            submittedBy: { displayTag: 'Innovator', name: '[unknown user]' },
            openTasksCount: 0
          },
          data: {
            currentlyCollectingEvidence: expect.any(String),
            evidences: expect.any(Array),
            hasEvidence: expect.any(String),
            needsSupportAnyArea: expect.any(Array),
            summaryOngoingEvidenceGathering: expect.any(String)
          }
        },
        ...[
          'MARKET_RESEARCH',
          'CURRENT_CARE_PATHWAY',
          'TESTING_WITH_USERS',
          'REGULATIONS_AND_STANDARDS',
          'INTELLECTUAL_PROPERTY',
          'REVENUE_MODEL',
          'COST_OF_INNOVATION',
          'DEPLOYMENT'
        ].map(s => ({
          section: {
            section: s,
            status: 'NOT_STARTED',
            openTasksCount: 0
          },
          data: expect.any(Object)
        }))
      ]);
    });

    it('should return empty section data if the user is an accessor and the section is not submitted', async () => {
      const allSectionsInfo = await sut.findAllSections(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        CurrentDocumentConfig.version,
        em
      );

      expect(allSectionsInfo).toStrictEqual([
        {
          section: {
            section: innovation.sections.INNOVATION_DESCRIPTION.section,
            status: innovation.sections.INNOVATION_DESCRIPTION.status,
            submittedAt: undefined,
            submittedBy: { displayTag: 'Innovator', name: '[unknown user]' },
            openTasksCount: 3 // John innovation has 4 tasks, 3 open and 1 done
          },
          data: expect.any(Object)
        },
        {
          section: {
            section: 'UNDERSTANDING_OF_NEEDS',
            status: 'NOT_STARTED',
            openTasksCount: 0
          },
          data: expect.any(Object)
        },
        {
          section: {
            section: innovation.sections.EVIDENCE_OF_EFFECTIVENESS.section,
            status: innovation.sections.EVIDENCE_OF_EFFECTIVENESS.status,
            submittedAt: undefined,
            submittedBy: { displayTag: 'Innovator', name: '[unknown user]' },
            openTasksCount: 0
          },
          data: expect.any(Object)
        },
        ...[
          'MARKET_RESEARCH',
          'CURRENT_CARE_PATHWAY',
          'TESTING_WITH_USERS',
          'REGULATIONS_AND_STANDARDS',
          'INTELLECTUAL_PROPERTY',
          'REVENUE_MODEL',
          'COST_OF_INNOVATION',
          'DEPLOYMENT'
        ].map(s => ({
          section: {
            section: s,
            status: 'NOT_STARTED',
            openTasksCount: 0
          },
          data: expect.any(Object)
        }))
      ]);
    });
  });
});
