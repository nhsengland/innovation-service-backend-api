import { container } from '../_config';

import { CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { randProductDescription } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import SYMBOLS from './symbols';
import type { InnovationDocumentService } from './innovation-document.service';
import { ServiceRoleEnum } from '@innovations/shared/enums';

describe('Innovation Document suite', () => {
  let sut: InnovationDocumentService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationDocumentService>(SYMBOLS.InnovationDocumentService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  const johnInnovator = scenario.users.johnInnovator;
  const innovation = johnInnovator.innovations.johnInnovation;

  describe('getInnovationDocument', () => {
    const draftDescription = randProductDescription();

    beforeEach(async () => {
      await em.query(
        `UPDATE innovation_document_draft
      SET document = JSON_MODIFY(document, @0, JSON_QUERY(@1)), updated_by=@2, updated_at=@3 WHERE id = @4`,
        [
          `$.INNOVATION_DESCRIPTION`,
          JSON.stringify({ description: draftDescription }),
          johnInnovator.id,
          new Date(),
          innovation.id
        ]
      );
    });

    it('should return the version in draft', async () => {
      const document = await sut.getInnovationDocument(innovation.id, CurrentDocumentConfig.version, 'DRAFT', em);
      expect(document.INNOVATION_DESCRIPTION.description).toBe(draftDescription);
    });

    it('should return the version that was latest submitted', async () => {
      const document = await sut.getInnovationDocument(innovation.id, CurrentDocumentConfig.version, 'SUBMITTED', em);
      expect(document.INNOVATION_DESCRIPTION.description).not.toBe(draftDescription);
    });
  });

  describe('getDocumentTypeAccordingWithRole', () => {
    it.each([
      [ServiceRoleEnum.INNOVATOR, 'DRAFT'],
      [ServiceRoleEnum.ADMIN, 'DRAFT'],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, 'SUBMITTED'],
      [ServiceRoleEnum.ACCESSOR, 'SUBMITTED'],
      [ServiceRoleEnum.ASSESSMENT, 'SUBMITTED']
    ])('document type for %s should be %s', (role: ServiceRoleEnum, type: string) => {
      const outputType = sut.getDocumentTypeAccordingWithRole(role);
      expect(type).toBe(outputType);
    });
  });
});
