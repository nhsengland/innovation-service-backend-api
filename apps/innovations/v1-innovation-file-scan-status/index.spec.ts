import azureFunction from '.';

import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import type { FileDownloadAccess } from '@innovations/shared/services';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import { randUuid } from '@ngneat/falso';
import { InnovationFileService } from '../_services/innovation-file.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
}));

const helper = new TestsHelper();
const scenario = helper.getCompleteScenario();
const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
const fileId = randUuid();
const getFileInfo = jest.spyOn(InnovationFileService.prototype, 'getFileInfo');

const fileInfo = (access: FileDownloadAccess): Awaited<ReturnType<InnovationFileService['getFileInfo']>> => ({
  id: fileId,
  storageId: randUuid(),
  context: { id: innovation.id, type: InnovationFileContextTypeEnum.INNOVATION },
  name: 'Test file',
  createdAt: new Date(),
  createdBy: { name: 'Uploader', role: ServiceRoleEnum.INNOVATOR },
  file: { name: 'test.pdf', extension: 'pdf', size: 100, ...access },
  canDelete: true
});

const request = () =>
  new AzureHttpTriggerBuilder()
    .setAuth(scenario.users.johnInnovator)
    .setParams<ParamsType>({ innovationId: innovation.id, fileId });

beforeAll(async () => {
  await helper.init();
});
beforeEach(() => {
  getFileInfo.mockReset();
});
afterAll(() => {
  getFileInfo.mockRestore();
});

describe('v1-innovation-file-scan-status', () => {
  it.each(['scanning', 'rejected', 'delayed', 'scan_failed', 'not_scanned', 'removed', 'unavailable'] as const)(
    'returns %s without a signed URL and disables caching',
    async scanState => {
      getFileInfo.mockResolvedValueOnce(fileInfo({ scanState, canDownload: false }));
      const result = await request().call<ResponseDTO>(azureFunction);
      expect(result.status).toBe(200);
      expect(result.headers['Cache-Control']).toBe('no-store');
      expect(result.body).toMatchObject({ id: fileId, scanState, canDownload: false });
      expect(result.body).not.toHaveProperty('url');
      if (scanState === 'scanning') {
        expect(result.body.retryAfterSeconds).toBe(3);
      } else {
        expect(result.body).not.toHaveProperty('retryAfterSeconds');
      }
    }
  );

  it.each(['ready', 'legacy_allowed'] as const)('returns an allowed URL for %s', async scanState => {
    const url = 'https://example.test/file.pdf?test-only';
    getFileInfo.mockResolvedValueOnce(fileInfo({ scanState, canDownload: true, url }));
    const result = await request().call<ResponseDTO>(azureFunction);
    expect(result.status).toBe(200);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(result.body).toEqual({ id: fileId, scanState, canDownload: true, url });
  });

  it('rejects an unrelated innovator before reading file information and disables caching', async () => {
    const result = await new AzureHttpTriggerBuilder()
      .setAuth(scenario.users.ottoOctaviusInnovator)
      .setParams<ParamsType>({ innovationId: innovation.id, fileId })
      .call(azureFunction);
    expect(result.status).toBe(403);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(getFileInfo).not.toHaveBeenCalled();
  });

  it('disables caching when file lookup fails', async () => {
    getFileInfo.mockRejectedValueOnce(new Error('test lookup failure'));
    const result = await request().call(azureFunction);
    expect(result.status).toBe(500);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(result.body).not.toHaveProperty('url');
  });
});
