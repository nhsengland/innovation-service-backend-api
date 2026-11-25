import 'reflect-metadata';
jest.mock('./base.service', () => ({ BaseService: class {} }));
import { InnovationFileService } from './innovation-file.service';
import { InnovationSectionsService } from './innovation-sections.service';
import { InnovationsService } from './innovations.service';

const document = {
  EVIDENCE_OF_EFFECTIVENESS: { hasEvidence: 'YES' },
  evidences: [{ id: 'ev', description: 'Trial', evidenceSubmitType: 'OTHER_EFFECTIVENESS' }]
};

describe('fresh required-document submission guards', () => {
  it('rejects a blocked file with structured 422 details', async () => {
    const storage = {
      getDownloadAccessForFiles: jest
        .fn()
        .mockResolvedValue(new Map([['blob', { scanState: 'rejected', canDownload: false }]]))
    };
    const documents = { getInnovationDocument: jest.fn().mockResolvedValue(document) };
    const manager = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'file', storageId: 'blob', filename: 'trial.pdf', contextId: 'ev', contextType: 'INNOVATION_EVIDENCE' }
        ])
    };
    const service = new InnovationFileService(
      {} as never,
      storage as never,
      {} as never,
      {} as never,
      documents as never
    );
    await expect((service as any).validateRequiredDocuments('innovation', undefined, manager)).rejects.toMatchObject({
      name: 'I.0036',
      details: {
        files: [expect.objectContaining({ filename: 'trial.pdf', scanState: 'rejected', contextName: 'Trial' })]
      }
    });
  });
  it('rechecks storage on each attempt and allows the retry only after the file is clean', async () => {
    const storage = {
      getDownloadAccessForFiles: jest
        .fn()
        .mockResolvedValueOnce(new Map([['blob', { scanState: 'scanning', canDownload: false }]]))
        .mockResolvedValueOnce(new Map([['blob', { scanState: 'ready', canDownload: true }]]))
    };
    const documents = { getInnovationDocument: jest.fn().mockResolvedValue(document) };
    const manager = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 'file', storageId: 'blob', filename: 'trial.pdf', contextId: 'ev', contextType: 'INNOVATION_EVIDENCE' }
        ])
    };
    const service = new InnovationFileService(
      {} as never,
      storage as never,
      {} as never,
      {} as never,
      documents as never
    );
    await expect(service.validateRequiredDocuments('innovation', undefined, manager as never)).rejects.toMatchObject({
      name: 'I.0036'
    });
    await expect(service.validateRequiredDocuments('innovation', undefined, manager as never)).resolves.toBeUndefined();
    expect(storage.getDownloadAccessForFiles).toHaveBeenCalledTimes(2);
  });
  it('does not check unrelated optional attachments', async () => {
    const storage = { getDownloadAccessForFiles: jest.fn().mockResolvedValue(new Map()) };
    const documents = { getInnovationDocument: jest.fn().mockResolvedValue(document) };
    const manager = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'file',
          storageId: 'optional',
          filename: 'optional.pdf',
          contextId: 'other',
          contextType: 'INNOVATION_MESSAGE'
        }
      ])
    };
    const service = new InnovationFileService(
      {} as never,
      storage as never,
      {} as never,
      {} as never,
      documents as never
    );
    await expect(service.validateRequiredDocuments('innovation', undefined, manager as never)).rejects.toMatchObject({
      details: { files: [expect.objectContaining({ scanState: 'missing' })] }
    });
    expect(storage.getDownloadAccessForFiles).toHaveBeenCalledWith([]);
  });
  it.each(['DRAFT', 'SUBMITTED'])('rechecks a %s section before completing or returning', async status => {
    const guard = jest.fn().mockRejectedValue(new Error('blocked'));
    const query: any = {
      leftJoinAndSelect: () => query,
      where: () => query,
      andWhere: () => query,
      getOne: async () => ({ sections: [{ id: 'section', status }] })
    };
    const service = Object.assign(Object.create(InnovationSectionsService.prototype), {
      innovationFileService: { validateRequiredDocuments: guard }
    });
    await expect(
      service.submitInnovationSection({ id: 'user' }, 'innovation', 'EVIDENCE_OF_EFFECTIVENESS', {
        createQueryBuilder: () => query
      })
    ).rejects.toThrow('blocked');
    expect(guard).toHaveBeenCalledWith('innovation', 'EVIDENCE_OF_EFFECTIVENESS', expect.anything());
  });
  it('checks files before final submission even with all sections complete', async () => {
    const guard = jest.fn().mockRejectedValue(new Error('blocked'));
    const transaction = jest.fn();
    const query: any = {
      leftJoinAndSelect: () => query,
      where: () => query,
      getOne: async () => ({ sections: [{ status: 'SUBMITTED' }] })
    };
    const service = Object.assign(Object.create(InnovationsService.prototype), {
      innovationFileService: { validateRequiredDocuments: guard },
      hasIncompleteSections: async () => false
    });
    await expect(
      service.submitInnovation({}, 'innovation', { createQueryBuilder: () => query, transaction })
    ).rejects.toThrow('blocked');
    expect(transaction).not.toHaveBeenCalled();
  });
});
