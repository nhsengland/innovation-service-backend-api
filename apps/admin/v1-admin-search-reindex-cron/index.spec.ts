import azureFunction from '.';

import { TestsHelper } from '@admin/shared/tests';
import { SearchService } from '../_services/search.service';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const mock = jest.spyOn(SearchService.prototype, 'createAndPopulateIndex').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-admin-search-reindex-cron', () => {
  it('should recreate index and populete it', async () => {
    await azureFunction();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
