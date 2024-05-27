import azureFunction from '.';

import { RedisService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { SearchService } from '../_services/search.service';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const popFromSetSpy = jest.spyOn(RedisService.prototype, 'popFromSet').mockResolvedValueOnce('1111');
const upsertDocumentSpy = jest.spyOn(SearchService.prototype, 'upsertDocument').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-update-index-cron', () => {
  it('should reindex documents that are on redis', async () => {
    await azureFunction();
    expect(popFromSetSpy).toHaveBeenCalledTimes(2);
    expect(upsertDocumentSpy).toHaveBeenCalledTimes(1);
  });
});
