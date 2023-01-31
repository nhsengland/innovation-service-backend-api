/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationSectionBuilder } from '@innovations/shared/builders/innovation-section.builder';
import { InnovationBuilder } from '@innovations/shared/builders/innovation.builder';
import { ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum, InnovationActionStatusEnum, InnovationSectionEnum, InnovationSectionStatusEnum } from '@innovations/shared/enums';
import { NOSQLConnectionService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import { rand, randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType, InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from './interfaces';

describe('Innovation Sections Suite', () => {

  let sut: InnovationSectionsServiceType;
  let actionsService: InnovationActionsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {

    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();

    await TestsHelper.init();
    sut = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);
    actionsService = container.get<InnovationActionsServiceType>(InnovationActionsServiceSymbol);
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  it('should list all sections as an innovator for his innovation', async () => {
    // arrange
    const innovator = testData.baseUsers.innovator;
    const innovation = testData.innovation;

    await TestsHelper.TestDataBuilder
      .createAction((await innovation.sections)[0]!, (innovation.innovationSupports)[0]!)
      .setStatus(InnovationActionStatusEnum.REQUESTED)
      .build(em);

    const sectionsList = await sut.getInnovationSectionsList(
      { type: innovator.type },
      innovation.id,
      em
    );
    
    const actionCount = sectionsList.map(s => s.openActionsCount).reduce((a,b) => a+b, 0);
    const filteredActions = await actionsService.getActionsList(
      innovator,
      { innovationId: innovation.id, status: [InnovationActionStatusEnum.REQUESTED], fields: [] },
      { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
      testData.domainContexts.innovator,
      em
    );

    expect(sectionsList).toBeDefined();
    expect(actionCount).toEqual(filteredActions.count);
  });

  it('should list all sections as an assessor for an innovation', async () => {
    // arrange
    const assessor = testData.baseUsers.assessmentUser;
    const innovation = testData.innovation;

    await TestsHelper.TestDataBuilder
      .createAction((await innovation.sections)[0]!, (innovation.innovationSupports)[0]!)
      .setStatus(InnovationActionStatusEnum.REQUESTED)
      .build(em);

    const sectionsList = await sut.getInnovationSectionsList(
      { type: assessor.type },
      innovation.id,
      em
    );
    
    const actionCount = sectionsList.map(s => s.openActionsCount).reduce((a,b) => a+b, 0);
    const filteredActions = await actionsService.getActionsList(
      assessor,
      { innovationId: innovation.id, status: [InnovationActionStatusEnum.REQUESTED], fields: [] },
      { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
      testData.domainContexts.accessor,
      em
    );

    expect(sectionsList).toBeDefined();
    expect(actionCount).toEqual(filteredActions.count);
  });

  it('should get submitted section info',async () => {
    
    // arrange
    const assessor = testData.baseUsers.assessmentUser;
    const innovation = testData.innovation;

    const sectionKey = rand(Object.values(InnovationSectionEnum));

    const sectionsList = await sut.getInnovationSectionInfo(
      { type: assessor.type },
      innovation.id,
      sectionKey,
      {}
    );

    expect(sectionsList.id).toBeDefined();
  });

  it('should not get draft section info as accessor',async () => {
    
    // arrange
    const accessor = testData.baseUsers.accessor;

    const innovation = await new InnovationBuilder()
      .setOwner(testData.baseUsers.innovator)
      .build(em);

    const sectionKey = rand(Object.values(InnovationSectionEnum));
    await new InnovationSectionBuilder(innovation)
      .setSection(sectionKey)
      .setStatus(InnovationSectionStatusEnum.DRAFT)
      .build(em);

    const section = await sut.getInnovationSectionInfo(
      { type: accessor.type },
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
      InnovationSectionEnum.INNOVATION_DESCRIPTION,
      { summary: randText() }
    );

    // assert
    expect(section.id).toBeDefined();
  });

  it('should submit a section', async () => {
    // arrange

    const innovator = testData.baseUsers.innovator;
    const innovation = await new InnovationBuilder()
    .setOwner(testData.baseUsers.innovator)
    .build(em);

  const sectionKey = rand(Object.values(InnovationSectionEnum));
  await new InnovationSectionBuilder(innovation)
    .setSection(sectionKey)
    .setStatus(InnovationSectionStatusEnum.DRAFT)
    .build(em);

    const section = await sut.submitInnovationSection(
      innovator,
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
    const file = await TestsHelper.TestDataBuilder.addFileToInnovation(innovation, em);

    const evidence = await sut.createInnovationEvidence(
      { id: innovator.id },
      innovation.id,
      {
        evidenceType: EvidenceTypeCatalogueEnum.CLINICAL,
        clinicalEvidenceType: rand(Object.values(ClinicalEvidenceTypeCatalogueEnum)),
        description: randText(),
        summary: randText(),
        files: [file.id]
      },
      em
    );

    // assert
    expect(evidence.id).toBeDefined();
  });

  it('should create non-clinical evidence', async () => {
    // arrange

    const innovator = testData.baseUsers.innovator;
    const innovation = testData.innovation;
    const file = await TestsHelper.TestDataBuilder.addFileToInnovation(innovation, em);

    const allowedEvidenceTypes = Object.values(EvidenceTypeCatalogueEnum).filter(et => et !== EvidenceTypeCatalogueEnum.CLINICAL);

    const evidence = await sut.createInnovationEvidence(
      { id: innovator.id },
      innovation.id,
      {
        evidenceType: rand(allowedEvidenceTypes),
        clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum.OTHER,
        description: randText(),
        summary: randText(),
        files: [file.id]
      },
      em
    );

    // assert
    expect(evidence.id).toBeDefined();
  });


});