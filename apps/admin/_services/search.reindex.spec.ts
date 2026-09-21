jest.mock('./base.service', () => ({
  BaseService: class {
    logger = { log: jest.fn(), error: jest.fn() };
  }
}));

import { ES_ENV } from '@admin/shared/config';
import { SearchService } from './search.service';

const document = (id: string): { id: string; title: string } => ({ id, title: id });

describe('Admin SearchService reindex batching', () => {
  const domainService = {
    innovations: {
      getESDocumentsInformation: jest.fn()
    }
  };
  const esService = {
    createIndex: jest.fn(),
    bulkInsert: jest.fn(),
    refreshIndex: jest.fn(),
    countDocuments: jest.fn()
  };
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    domainService.innovations.getESDocumentsInformation.mockResolvedValue([document('1')]);
    esService.createIndex.mockResolvedValue(undefined);
    esService.bulkInsert.mockResolvedValue(undefined);
    esService.refreshIndex.mockResolvedValue(undefined);
    esService.countDocuments.mockResolvedValue(1);
    service = new SearchService(domainService as any, esService as any);
  });

  it('sends documents in batches of 500 and refreshes once at the end', async () => {
    const documents = Array.from({ length: 1001 }, (_, index) => document(String(index)));
    domainService.innovations.getESDocumentsInformation.mockResolvedValue(documents);
    esService.countDocuments.mockResolvedValue(documents.length);

    await service.createAndPopulateIndex();

    expect(esService.bulkInsert).toHaveBeenCalledTimes(3);
    expect(esService.bulkInsert.mock.calls.map(([index, batch]) => [index, batch.length])).toEqual([
      [ES_ENV.esInnovationIndexName, 500],
      [ES_ENV.esInnovationIndexName, 500],
      [ES_ENV.esInnovationIndexName, 1]
    ]);
    expect(esService.bulkInsert.mock.calls.every(([, , options]) => options.refresh === false)).toBe(true);
    expect(esService.refreshIndex).toHaveBeenCalledTimes(1);
    expect(esService.countDocuments).toHaveBeenCalledWith(ES_ENV.esInnovationIndexName);
  });

  it('fails when Elasticsearch count differs from the SQL source count', async () => {
    const documents = [document('1'), document('2')];
    domainService.innovations.getESDocumentsInformation.mockResolvedValue(documents);
    esService.countDocuments.mockResolvedValue(1);

    await expect(service.createAndPopulateIndex()).rejects.toThrow();
  });

  it('stops sending batches after a failed bulk request', async () => {
    const documents = Array.from({ length: 1001 }, (_, index) => document(String(index)));
    domainService.innovations.getESDocumentsInformation.mockResolvedValue(documents);
    esService.bulkInsert.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('bulk failed'));

    await expect(service.createAndPopulateIndex()).rejects.toThrow('bulk failed');
    expect(esService.bulkInsert).toHaveBeenCalledTimes(2);
    expect(esService.refreshIndex).not.toHaveBeenCalled();
  });
});
