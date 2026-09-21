import azureFunction from '.';

import { DomainInnovationsService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const mock = jest.spyOn(DomainInnovationsService.prototype, 'archiveExpiredInnovations').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-system-cron-archive-innovations', () => {
  it('should archive expired innovations', async () => {
    await azureFunction();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
