import azureFunction from '.';

import { DomainInnovationsService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const mock = jest.spyOn(DomainInnovationsService.prototype, 'cleanupInnovationDocuments').mockResolvedValue();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-system-cron-cleanup-innovation-documents', () => {
  it('should cleanup documents', async () => {
    await azureFunction();
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
