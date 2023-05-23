import { TestDataType, TestsLegacyHelper } from '@innovations/shared/tests/tests-legacy.helper';
import { container } from '../_config';

import { randText } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

describe('Innovation supports service test suite', () => {
  let sut: InnovationFileService;
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);
    await TestsLegacyHelper.init();
    testData = TestsLegacyHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsLegacyHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsLegacyHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('uploadInnovationFile', () => {
    it('should updload an innovation file', async () => {
      const filename = randText();

      const file = await sut.uploadInnovationFile(
        testData.baseUsers.innovator.id,
        testData.innovation.id,
        filename,
        randText(),
        em
      );

      expect(file.id).toBeDefined();
      expect(file.displayFileName).toBe(filename);
    });
  });
});
