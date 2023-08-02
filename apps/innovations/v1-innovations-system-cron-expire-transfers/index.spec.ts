import azureFunction from '.';

import { DomainInnovationsService, LoggerService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';

const testsHelper = new TestsHelper();

beforeAll(async () => {
  await testsHelper.init();
});

const withdrawMock = jest
  .spyOn(DomainInnovationsService.prototype, 'withdrawExpiredInnovationsTransfers')
  .mockResolvedValue();
const remindMock = jest.spyOn(DomainInnovationsService.prototype, 'remindInnovationsTransfers').mockResolvedValue();
const loggerErrorMock = jest.spyOn(LoggerService.prototype, 'error').mockImplementation();

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovations-system-cron-expire-transfers', () => {
  it('should withdraw expired innovations', async () => {
    await azureFunction();
    expect(withdrawMock).toHaveBeenCalledTimes(1);
  });

  it('should remind innovations transfers', async () => {
    await azureFunction();
    expect(remindMock).toHaveBeenCalledTimes(1);
    expect(remindMock).toHaveBeenCalledWith(7, 1);
  });

  it('should log errors without failing', async () => {
    withdrawMock.mockRejectedValueOnce(new Error('test'));
    remindMock.mockRejectedValueOnce(new Error('test'));
    await azureFunction();
    expect(loggerErrorMock).toHaveBeenCalledTimes(2);
  });
});
