/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { InnovationSectionEntity } from '@innovations/shared/entities';
import { InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { rand, randText, randUuid } from '@ngneat/falso';
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

      const actionCount = sectionsList.map(s => s.openActionsCount).reduce((a, b) => a + b, 0);

      expect(sectionsList).toBeDefined();
      expect(actionCount).toEqual(2);
    });

    it('should list all sections as an accessor for an innovation', async () => {
      const sectionsList = await sut.getInnovationSectionsList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      const actionCount = sectionsList.map(s => s.openActionsCount).reduce((a, b) => a + b, 0);

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
        {}
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

      expect(section.data).toBeNull();
    });
  });

  describe('updateInnovationSectionInfo', () => {
    it('should update a section', async () => {
      const section = await sut.updateInnovationSectionInfo(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        'INNOVATION_DESCRIPTION',
        { summary: randText() }
      );

      // assert
      expect(section.id).toBeDefined();
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
          summary: randText(),
          files: [randUuid()]
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
          summary: randText(),
          files: [randUuid()]
        },
        em
      );

      // assert assuming if no error is thrown then the test is successful (for now)
    });
  });
});
