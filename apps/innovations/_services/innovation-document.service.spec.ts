import { container } from '../_config';

import { InnovationDocumentEntity } from '@innovations/shared/entities';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import { CurrentDocumentConfig } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import type { InnovationDocumentService } from './innovation-document.service';
import SYMBOLS from './symbols';

describe('Innovation Document suite', () => {
  let sut: InnovationDocumentService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const johnInnovator = scenario.users.johnInnovator;
  const innovation = johnInnovator.innovations.johnInnovation;
  const draftDescription = 'draft';

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationDocumentService>(SYMBOLS.InnovationDocumentService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
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

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getInnovationDocument', () => {
    it('should return the version in draft', async () => {
      const document = await sut.getInnovationDocument(innovation.id, CurrentDocumentConfig.version, 'DRAFT', em);
      expect(document.INNOVATION_DESCRIPTION.description).toBe(draftDescription);
    });

    it('should return the version that was latest submitted', async () => {
      const document = await sut.getInnovationDocument(innovation.id, CurrentDocumentConfig.version, 'SUBMITTED', em);
      expect(document.INNOVATION_DESCRIPTION.description).not.toBe(draftDescription);
    });
  });

  describe('syncDocumentVersions', () => {
    it('should sync the SUBMITTED version with the DRAFT version', async () => {
      const now = new Date();
      await sut.syncDocumentVersions(DTOsHelper.getUserRequestContext(johnInnovator), innovation.id, em, {
        updatedAt: now
      });

      const dbDocument = await em
        .createQueryBuilder(InnovationDocumentEntity, 'document')
        .select(['document.document', 'document.updatedAt', 'document.updatedBy'])
        .where('document.id = :innovationId', { innovationId: innovation.id })
        .getOneOrFail();

      expect(dbDocument.document.INNOVATION_DESCRIPTION.description).toBe(draftDescription);
      expect(dbDocument.updatedAt).toStrictEqual(now);
      expect(dbDocument.updatedBy).toBe(johnInnovator.id);
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
