import { TestsHelper } from '@admin/shared/tests';

import { DomainInnovationsService, ElasticSearchService } from '@admin/shared/services';
import { container } from '../_config';
import SYMBOLS from './symbols';
import type { SearchService } from './search.service';

describe('Admin / _services / search service suite', () => {
  let sut: SearchService;

  const testsHelper = new TestsHelper();

  const supportLogSpy = jest
    .spyOn(DomainInnovationsService.prototype, 'getESDocumentsInformation')
    .mockResolvedValue([] as any);
  const createIndexSpy = jest.spyOn(ElasticSearchService.prototype, 'createIndex').mockResolvedValue();
  const bulkInsertSpy = jest.spyOn(ElasticSearchService.prototype, 'bulkInsert').mockResolvedValue();

  beforeAll(async () => {
    sut = container.get<SearchService>(SYMBOLS.SearchService);
    await testsHelper.init();
  });

  afterEach(async () => {
    supportLogSpy.mockReset();
    createIndexSpy.mockReset();
    bulkInsertSpy.mockReset();
  });

  describe('createAndPopulateIndex', () => {
    it('should create and populate index', async () => {
      await sut.createAndPopulateIndex();

      expect(supportLogSpy).toHaveBeenCalledTimes(1);
      expect(createIndexSpy).toHaveBeenCalledTimes(1);
      expect(bulkInsertSpy).toHaveBeenCalledTimes(1);
    });
  });
});
