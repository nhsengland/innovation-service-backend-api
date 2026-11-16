import 'reflect-metadata';
import { BlobClient, generateBlobSASQueryParameters } from '@azure/storage-blob';
import type { LoggerService } from '../integrations/logger.service';
import { FileStorageService } from './file-storage.service';

jest.mock('../../config/file-storage.config', () => ({
  FILE_STORAGE_CONFIG: {
    storageBaseUrl: 'https://test.invalid',
    storageContainer: 'files',
    storageAccount: 'unit-test',
    storageKey: 'dGVzdA=='
  }
}));
jest.mock('@azure/storage-blob', () => {
  const real = jest.requireActual('@azure/storage-blob');
  return { ...real, BlobClient: jest.fn(), generateBlobSASQueryParameters: jest.fn() };
});

describe('FileStorageService scan-gated download access', () => {
  const now = 1_000_000;
  const resultKey = 'Malware Scanning scan result';
  let service: FileStorageService;
  let getProperties: jest.Mock;
  let getTags: jest.Mock;
  let log: jest.Mock;
  const signer = jest.mocked(generateBlobSASQueryParameters);
  const blobConstructor = jest.mocked(BlobClient);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    getProperties = jest.fn().mockResolvedValue({ createdOn: new Date(now) });
    getTags = jest.fn().mockResolvedValue({ tags: { [resultKey]: 'No threats found' } });
    blobConstructor.mockImplementation(() => ({ getProperties, getTags }) as unknown as BlobClient);
    signer.mockReturnValue({ toString: () => 'unit-signature' } as ReturnType<typeof generateBlobSASQueryParameters>);
    log = jest.fn();
    service = new FileStorageService({ log } as unknown as LoggerService);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [{}, 'legacy_allowed', true],
    [{ [resultKey]: 'No threats found' }, 'ready', true],
    [{ [resultKey]: 'Malicious' }, 'rejected', false],
    [{ [resultKey]: 'Not scanned' }, 'not_scanned', false],
    [{ [resultKey]: 'Error' }, 'scan_failed', false],
    [{ [resultKey]: 'Skipped' }, 'scan_failed', false],
    [{ [resultKey]: 'no threats found' }, 'scan_failed', false],
    [{ [resultKey]: 'unknown' }, 'scan_failed', false],
    [{ ScanStatus: 'Pending' }, 'scanning', false]
  ] as const)('gates URL for %j', async (tags, scanState, canDownload) => {
    getTags.mockResolvedValue({ tags });
    const access = await service.getDownloadAccess('file-id', 'report.pdf');
    expect(access).toEqual(
      canDownload
        ? { scanState, canDownload, url: 'https://test.invalid/files/file-id?unit-signature' }
        : { scanState, canDownload }
    );
    expect(signer).toHaveBeenCalledTimes(canDownload ? 1 : 0);
    expect(blobConstructor).toHaveBeenCalledWith('https://test.invalid/files/file-id', expect.anything(), {
      retryOptions: { maxTries: 2, tryTimeoutInMs: 5_000 }
    });
  });

  it('blocks delayed scans using storage creation time', async () => {
    getProperties.mockResolvedValue({ createdOn: new Date(now - 300_000) });
    getTags.mockResolvedValue({ tags: { ScanStatus: 'Pending' } });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'delayed',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
  });

  it('blocks and diagnoses pending scans with no creation timestamp', async () => {
    getProperties.mockResolvedValue({});
    getTags.mockResolvedValue({ tags: { ScanStatus: 'Pending' } });
    expect(await service.getFileScanStatus('file-id')).toEqual({
      state: 'scanning',
      canDownload: false,
      retryAfterSeconds: 3
    });
    expect(log).toHaveBeenCalledWith('FileStorage::missingCreationTime', { storageId: 'file-id' });
  });

  it.each([404, 403, 429, 500, undefined])(
    'blocks properties lookup status %s without logging secrets',
    async statusCode => {
      getProperties.mockRejectedValue({ statusCode, message: 'secret-signed-url' });
      expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
        scanState: 'unavailable',
        canDownload: false
      });
      expect(getTags).not.toHaveBeenCalled();
      expect(signer).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret-signed-url');
      expect(log).toHaveBeenCalledWith('FileStorage::scanLookupFailed', {
        storageId: 'file-id',
        statusCode,
        reason: statusCode === 404 ? 'not_found' : 'storage_unavailable'
      });
    }
  );

  it.each(['properties', 'tags'])('reports removed only for confirmed missing blob during %s lookup', async lookup => {
    const method = lookup === 'properties' ? getProperties : getTags;
    method.mockRejectedValue({ statusCode: 404, code: 'BlobNotFound' });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'removed',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
  });

  it('does not label a missing container as a removed file', async () => {
    getProperties.mockRejectedValue({ statusCode: 404, code: 'ContainerNotFound' });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'unavailable',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
  });

  it('recognizes the real Azure HEAD response error in details.errorCode', async () => {
    getProperties.mockRejectedValue({ statusCode: 404, details: { errorCode: 'BlobNotFound' } });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'removed',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
  });

  it('blocks tag lookup failure even when properties exist', async () => {
    getTags.mockRejectedValue(new Error('secret-signed-url'));
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'unavailable',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-signed-url');
  });

  it('blocks SDK client construction failure', async () => {
    blobConstructor.mockImplementation(() => {
      throw new Error('secret-signed-url');
    });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'unavailable',
      canDownload: false
    });
    expect(signer).not.toHaveBeenCalled();
  });

  it('fails closed when signing a clean file fails', async () => {
    signer.mockImplementation(() => {
      throw new Error('secret-signing-material');
    });
    expect(await service.getDownloadAccess('file-id', 'report.pdf')).toEqual({
      scanState: 'unavailable',
      canDownload: false
    });
    expect(log).toHaveBeenCalledWith('FileStorage::downloadSigningFailed', { storageId: 'file-id' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret-signing-material');
  });

  it('uses read-only HTTPS SAS with a 15 minute lifetime', async () => {
    await service.getDownloadAccess('file-id', 'report,(1).pdf');
    const signature = signer.mock.calls[0]![0];
    expect(signature.permissions?.toString()).toBe('r');
    expect(signature.protocol).toBe('https');
    expect(signature.expiresOn!.getTime() - signature.startsOn!.getTime()).toBe(900_000);
    expect(signature.contentDisposition).toBe('filename=report1.pdf');
  });

  it('does no SDK work for an empty request', async () => {
    expect(await service.getDownloadAccessForFiles([])).toEqual(new Map());
    expect(blobConstructor).not.toHaveBeenCalled();
  });

  it('deduplicates storage IDs within each request and refreshes on the next request', async () => {
    const files = [
      { storageId: 'same', filename: 'first.pdf' },
      { storageId: 'same', filename: 'last.pdf' }
    ];
    const access = await service.getDownloadAccessForFiles(files);
    expect(access.size).toBe(1);
    expect(getProperties).toHaveBeenCalledTimes(1);
    expect(getTags).toHaveBeenCalledTimes(1);
    expect(signer).toHaveBeenCalledTimes(1);
    getTags.mockResolvedValue({ tags: { [resultKey]: 'Malicious' } });
    expect((await service.getDownloadAccessForFiles(files)).get('same')).toEqual({
      scanState: 'rejected',
      canDownload: false
    });
    expect(getTags).toHaveBeenCalledTimes(2);
    expect(signer).toHaveBeenCalledTimes(1);
  });

  it('limits actual Blob lookups to five concurrent files and processes later batches', async () => {
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    getProperties.mockImplementation(() => {
      active++;
      peak = Math.max(peak, active);
      return new Promise(resolve =>
        releases.push(() => {
          active--;
          resolve({ createdOn: new Date(now) });
        })
      );
    });
    const pending = service.getDownloadAccessForFiles(
      Array.from({ length: 12 }, (_, i) => ({ storageId: `id-${i}`, filename: `${i}.pdf` }))
    );
    const flush = (): Promise<void> => new Promise<void>(resolve => setImmediate(resolve));
    expect(getProperties).toHaveBeenCalledTimes(5);
    releases.splice(0).forEach(release => release());
    await flush();
    expect(getProperties).toHaveBeenCalledTimes(10);
    releases.splice(0).forEach(release => release());
    await flush();
    expect(getProperties).toHaveBeenCalledTimes(12);
    releases.splice(0).forEach(release => release());
    expect((await pending).size).toBe(12);
    expect(peak).toBe(5);
    expect(active).toBe(0);
    expect(getTags).toHaveBeenCalledTimes(12);
  });
});
