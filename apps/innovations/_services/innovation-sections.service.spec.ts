/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsLegacyHelper } from '@innovations/shared/tests/tests-legacy.helper';
import { container } from '../_config';

import { InnovationSectionBuilder } from '@innovations/shared/builders/innovation-section.builder';
import { InnovationBuilder } from '@innovations/shared/builders/innovation.builder';
import { InnovationActionStatusEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { DomainUsersService } from '@innovations/shared/services';
import { rand, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationSectionsService } from './innovation-sections.service';
import SYMBOLS from './symbols';

describe('Innovation Sections Suite', () => {
  let sut: InnovationSectionsService;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);
    await TestsLegacyHelper.init();
    testData = TestsLegacyHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
      displayName: randText(),
    } as any);
    em = await TestsLegacyHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsLegacyHelper.releaseQueryRunnerEntityManager(em);
  });

  it('should list all sections as an innovator for his innovation', async () => {
    // arrange
    const innovation = testData.innovation;

    await TestsLegacyHelper.TestDataBuilder.createAction(
      testData.domainContexts.accessor,
      (
        await innovation.sections
      )[0]!,
      innovation.innovationSupports[0]!
    )
      .setStatus(InnovationActionStatusEnum.REQUESTED)
      .build(em);

    const sectionsList = await sut.getInnovationSectionsList(
      testData.domainContexts.innovator,
      innovation.id,
      em
    );

    const actionCount = sectionsList.map((s) => s.openActionsCount).reduce((a, b) => a + b, 0);

    expect(sectionsList).toBeDefined();
    expect(actionCount).toEqual(2); // one from the database plus the one we added
  });

  it('should list all sections as an accessor for an innovation', async () => {
    // arrange
    const innovation = testData.innovation;

    await TestsLegacyHelper.TestDataBuilder.createAction(
      testData.domainContexts.accessor,
      (
        await innovation.sections
      )[0]!,
      innovation.innovationSupports[0]!
    )
      .setUpdatedBy(testData.baseUsers.innovator.id)
      .setStatus(InnovationActionStatusEnum.SUBMITTED)
      .build(em);

    const sectionsList = await sut.getInnovationSectionsList(
      testData.domainContexts.accessor,
      innovation.id,
      em
    );

    const actionCount = sectionsList.map((s) => s.openActionsCount).reduce((a, b) => a + b, 0);

    expect(sectionsList).toBeDefined();
    expect(actionCount).toEqual(1); // The DB has no record in submitted status and we added one
  });

  it('should get submitted section info', async () => {
    // arrange
    const innovation = testData.innovation;

    const sectionKey = rand(CurrentCatalogTypes.InnovationSections);

    const sectionsList = await sut.getInnovationSectionInfo(
      testData.domainContexts.assessmentUser,
      innovation.id,
      sectionKey,
      {}
    );

    expect(sectionsList.id).toBeDefined();
  });

  it('should not get draft section info as accessor', async () => {
    // arrange

    const innovation = await new InnovationBuilder()
      .setOwner(testData.baseUsers.innovator)
      .build(em);

    const sectionKey = rand(CurrentCatalogTypes.InnovationSections);
    await new InnovationSectionBuilder(innovation)
      .setSection(sectionKey)
      .setStatus(InnovationSectionStatusEnum.DRAFT)
      .build(em);

    const section = await sut.getInnovationSectionInfo(
      testData.domainContexts.accessor,
      innovation.id,
      sectionKey,
      {},
      em
    );

    expect(section.data).toBeNull();
  });

  it('should update a section', async () => {
    // arrange

    const innovator = testData.baseUsers.innovator;
    const innovation = testData.innovation;

    const section = await sut.updateInnovationSectionInfo(
      { id: innovator.id },
      testData.domainContexts.innovator,
      innovation.id,
      'INNOVATION_DESCRIPTION',
      { summary: randText() }
    );

    // assert
    expect(section.id).toBeDefined();
  });

  it('should submit a section', async () => {
    // arrange

    const innovation = await new InnovationBuilder()
      .setOwner(testData.baseUsers.innovator)
      .build(em);

    const sectionKey = rand(CurrentCatalogTypes.InnovationSections);
    await new InnovationSectionBuilder(innovation)
      .setSection(sectionKey)
      .setStatus(InnovationSectionStatusEnum.DRAFT)
      .build(em);

    const section = await sut.submitInnovationSection(
      testData.domainContexts.innovator,
      innovation.id,
      sectionKey,
      em
    );

    // assert
    expect(section.id).toBeDefined();
  });

  it('should create clinical evidence', async () => {
    // arrange

    const innovator = testData.baseUsers.innovator;
    const innovation = testData.innovation;
    const file = await TestsLegacyHelper.TestDataBuilder.addFileToInnovation(innovation, em);

    await sut.createInnovationEvidence(
      { id: innovator.id },
      innovation.id,
      {
        evidenceSubmitType: 'CLINICAL_OR_CARE',
        evidenceType: rand(Object.values(CurrentCatalogTypes.catalogEvidenceType)),
        description: randText(),
        summary: randText(),
        files: [file.id],
      },
      em
    );

    // assert assuming if no error is thrown then the test is successful (for now)
  });

  // TODO FIX THIS TEST WHEN EVIDENCES ARE FIXED
  it('should create non-clinical evidence', async () => {
    // arrange

    const innovator = testData.baseUsers.innovator;
    const innovation = testData.innovation;
    const file = await TestsLegacyHelper.TestDataBuilder.addFileToInnovation(innovation, em);

    const allowedEvidenceTypes = CurrentCatalogTypes.catalogEvidenceSubmitType.filter(
      (et) => et !== 'CLINICAL_OR_CARE'
    );

    await sut.createInnovationEvidence(
      { id: innovator.id },
      innovation.id,
      {
        evidenceSubmitType: rand(allowedEvidenceTypes),
        evidenceType: 'OTHER',
        description: randText(),
        summary: randText(),
        files: [file.id],
      },
      em
    );

    // assert assuming if no error is thrown then the test is successful (for now)
  });
});
