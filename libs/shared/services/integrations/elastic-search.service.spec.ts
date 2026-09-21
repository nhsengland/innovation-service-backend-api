import { InternalServerError } from '../../errors';
import { ElasticSearchService } from './elastic-search.service';

const logger = {
  log: jest.fn(),
  error: jest.fn()
};

describe('ElasticSearchService reindex operations', () => {
  let service: ElasticSearchService;
  let client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ElasticSearchService(logger as any);
    client = service.client as any;
    jest.spyOn(client, 'bulk').mockResolvedValue({ errors: false, items: [{ index: {} }], took: 1 });
    jest.spyOn(client, 'count').mockResolvedValue({ count: 2 });
    jest.spyOn(client.indices, 'refresh').mockResolvedValue({});
  });

  it('allows reindex batches to disable refresh while preserving the existing default', async () => {
    const documents = [{ id: '1', title: 'One' }];

    await service.bulkInsert('ir-documents-node', documents, { refresh: false });
    await service.bulkInsert('ir-documents-node', documents);

    expect(client.bulk).toHaveBeenNthCalledWith(1, expect.objectContaining({ refresh: false }));
    expect(client.bulk).toHaveBeenNthCalledWith(2, expect.objectContaining({ refresh: true }));
  });

  it('rejects when the bulk response contains item-level errors', async () => {
    client.bulk.mockResolvedValueOnce({
      errors: true,
      items: [{ index: { error: { reason: 'rejected' } } }],
      took: 1
    });

    await expect(service.bulkInsert('ir-documents-node', [{ id: '1' }], { refresh: false })).rejects.toBeInstanceOf(
      InternalServerError
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('1 documents'));
  });

  it('refreshes and counts documents explicitly', async () => {
    await service.refreshIndex('ir-documents-node');
    await expect(service.countDocuments('ir-documents-node')).resolves.toBe(2);

    expect(client.indices.refresh).toHaveBeenCalledWith({ index: 'ir-documents-node' });
    expect(client.count).toHaveBeenCalledWith({ index: 'ir-documents-node' });
  });
});
