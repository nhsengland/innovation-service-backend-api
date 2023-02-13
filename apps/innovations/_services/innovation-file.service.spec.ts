import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { NOSQLConnectionService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import type { EntityManager } from 'typeorm';
import { InnovationFileServiceSymbol, InnovationFileServiceType } from './interfaces';
import type { InnovationFileService } from './innovation-file.service';
import { randText } from '@ngneat/falso';

describe('Innovation supports service test suite', () => {

  let sut: InnovationFileService;
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationFileServiceType>(InnovationFileServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
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