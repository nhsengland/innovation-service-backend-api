import { container } from '../_config';

import { InnovationFileEntity } from '@innovations/shared/entities';
import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import {
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { FileStorageService } from '@innovations/shared/services';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@innovations/shared/tests';
import type { TestFileType } from '@innovations/shared/tests/builders/innovation-file.builder';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { DomainContextType } from '@innovations/shared/types';
import { randFileName, randNumber, randText, randUrl, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

describe('Services / Innovation File service suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let sut: InnovationFileService;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getFileInfo()', () => {
    let userMap: Map<string, { user: TestUserType; file: TestFileType; role: ServiceRoleEnum; orgUnitName?: string }>;
    let innovation: typeof scenario.users.johnInnovator.innovations.johnInnovation;

    beforeAll(() => {
      innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      userMap = new Map([
        [
          'johnInnovator',
          {
            user: scenario.users.johnInnovator,
            file: innovation.files.sectionFileByJohn,
            role: scenario.users.johnInnovator.roles.innovatorRole.role
          }
        ],
        [
          'janeInnovator',
          {
            user: scenario.users.janeInnovator,
            file: innovation.files.sectionFileByJane,
            role: scenario.users.janeInnovator.roles.innovatorRole.role
          }
        ],
        [
          'aliceQualifyingAccessor',
          {
            user: scenario.users.aliceQualifyingAccessor,
            file: innovation.files.innovationFileByAlice,
            role: scenario.users.aliceQualifyingAccessor.roles.qaRole.role,
            orgUnitName:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          }
        ],
        [
          'ingridAccessor',
          {
            user: scenario.users.ingridAccessor,
            file: innovation.files.innovationFileByIngrid,
            role: scenario.users.ingridAccessor.roles.accessorRole.role,
            orgUnitName: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          }
        ],
        [
          'jamieMadroxAccessor',
          {
            user: scenario.users.jamieMadroxAccessor,
            file: innovation.files.innovationFileByJamieWithAiRole,
            role: scenario.users.jamieMadroxAccessor.roles.aiRole.role,
            orgUnitName:
              scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name
          }
        ],
        [
          'paulNeedsAssessor',
          {
            user: scenario.users.paulNeedsAssessor,
            file: innovation.files.innovationFileByPaul,
            role: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
          }
        ]
      ]);
    });

    describe.each([
      // As ... | request a file uploaded by ... | requestUser | fileUploadedBy | canDelete
      ['innovation owner', 'me', 'johnInnovator', 'johnInnovator', true],
      ['innovation owner', 'collaborator', 'johnInnovator', 'janeInnovator', true],
      ['innovation owner', 'QA', 'johnInnovator', 'aliceQualifyingAccessor', false],
      ['innovation owner', 'A', 'johnInnovator', 'ingridAccessor', false],
      ['innovation owner', 'NA', 'johnInnovator', 'paulNeedsAssessor', false],
      ['innovation collaborator', 'me', 'janeInnovator', 'janeInnovator', true],
      ['innovation collaborator', 'owner', 'janeInnovator', 'johnInnovator', true],
      ['innovation collaborator', 'QA', 'janeInnovator', 'aliceQualifyingAccessor', false],
      ['innovation collaborator', 'A', 'janeInnovator', 'ingridAccessor', false],
      ['innovation collaborator', 'NA', 'janeInnovator', 'paulNeedsAssessor', false],
      ['QA', 'me', 'aliceQualifyingAccessor', 'aliceQualifyingAccessor', true],
      ['QA', 'A in the same unit', 'aliceQualifyingAccessor', 'ingridAccessor', true],
      ['QA', 'A from other unit', 'aliceQualifyingAccessor', 'jamieMadroxAccessor', false],
      ['QA', 'innovation owner', 'aliceQualifyingAccessor', 'johnInnovator', false],
      ['QA', 'innovation collaborator', 'aliceQualifyingAccessor', 'janeInnovator', false],
      ['QA', 'NA', 'aliceQualifyingAccessor', 'paulNeedsAssessor', false],
      ['A', 'me', 'ingridAccessor', 'ingridAccessor', true],
      ['A', 'QA in the same unit', 'ingridAccessor', 'aliceQualifyingAccessor', true],
      ['A', 'A from other unit', 'ingridAccessor', 'jamieMadroxAccessor', false],
      ['A', 'innovation owner', 'ingridAccessor', 'johnInnovator', false],
      ['A', 'innovation collaborator', 'ingridAccessor', 'janeInnovator', false],
      ['A', 'NA', 'ingridAccessor', 'paulNeedsAssessor', false],
      ['NA', 'me', 'paulNeedsAssessor', 'paulNeedsAssessor', true],
      ['NA', 'innovation owner', 'paulNeedsAssessor', 'johnInnovator', false],
      ['NA', 'innovation collaborator', 'paulNeedsAssessor', 'janeInnovator', false],
      ['NA', 'QA', 'paulNeedsAssessor', 'aliceQualifyingAccessor', false],
      ['NA', 'A', 'paulNeedsAssessor', 'ingridAccessor', false]
    ])(
      'As a/an %s when I request a file information about a file uploaded by %s',
      (_: string, __: string, domainContextUser: string, fileCreatedByUser: string, canDelete: boolean) => {
        let fileCreatedBy: {
          user: TestUserType;
          file: TestFileType;
          role: ServiceRoleEnum;
          orgUnitName?: string;
          canDelete: boolean;
        };
        let randomUrl: string;
        let domainContext: DomainContextType;

        beforeAll(() => {
          randomUrl = randUrl();
          jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValue(randomUrl);
        });

        beforeEach(() => {
          switch (domainContextUser) {
            case 'johnInnovator':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
              break;
            case 'janeInnovator':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.janeInnovator, 'innovatorRole');
              break;
            case 'aliceQualifyingAccessor':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
              break;
            case 'ingridAccessor':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole');
              break;
            case 'paulNeedsAssessor':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');
              break;
            case 'jamieMadroxAccessor':
              domainContext = DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole');
              break;
            default:
              break;
          }

          fileCreatedBy = {
            ...userMap.get(fileCreatedByUser)!,
            canDelete
          };
          MocksHelper.mockIdentityServiceGetUserInfo(fileCreatedBy.user);
        });

        it(`should return the information about the file and canDelete as ${canDelete}`, async () => {
          const file = fileCreatedBy.file;
          const createdByUser = fileCreatedBy.user;

          const result = await sut.getFileInfo(domainContext, innovation.id, file.id, em);

          const expected: Awaited<ReturnType<InnovationFileService['getFileInfo']>> = {
            id: file.id,
            storageId: file.storageId,
            name: file.name,
            description: file.description,
            context: file.context,
            file: {
              name: file.file.name,
              size: file.file.size,
              extension: file.file.extension,
              url: randomUrl
            },
            createdAt: file.createdAt,
            createdBy: {
              name: createdByUser.name,
              role: fileCreatedBy.role,
              ...(fileCreatedBy.role === ServiceRoleEnum.INNOVATOR && {
                isOwner: fileCreatedBy.user.id === scenario.users.johnInnovator.id
              }),
              orgUnitName: fileCreatedBy.orgUnitName
            },
            canDelete: fileCreatedBy.canDelete
          };

          expect(result).toMatchObject(expected);
        });
      }
    );

    describe('As any role', () => {
      describe("when I request a file information about a file that doesn't exist", () => {
        it('should return a not found error', async () => {
          const domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
          const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

          await expect(() => sut.getFileInfo(domainContext, innovation.id, randUuid(), em)).rejects.toThrowError(
            new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND)
          );
        });
      });

      describe('when I request a file information about a file uploaded by a deleted innovator', () => {
        it('should return the createdBy name as [deleted user] and dont return isOwner', async () => {
          const domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
          const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
          const file = innovation.files.innovationFileByDeletedUser;
          const createdByUser = scenario.users.sebastiaoDeletedInnovator;

          // Mocks
          const randomUrl = randUrl();
          jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValue(randomUrl);

          const result = await sut.getFileInfo(domainContext, innovation.id, file.id, em);

          const expected: Awaited<ReturnType<InnovationFileService['getFileInfo']>> = {
            id: file.id,
            storageId: file.storageId,
            name: file.name,
            description: file.description,
            context: file.context,
            file: {
              name: file.file.name,
              size: file.file.size,
              extension: file.file.extension,
              url: randomUrl
            },
            createdAt: file.createdAt,
            createdBy: {
              name: '[deleted user]',
              role: createdByUser.roles.innovatorRole.role
            },
            canDelete: true
          };

          expect(result).toMatchObject(expected);
        });
      });
    });
  });

  describe('createFile()', () => {
    let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
    let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

    beforeAll(() => {
      innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      innovationOwner = scenario.users.johnInnovator;
    });

    describe('When I create a file as an innovator', () => {
      it.each([
        [InnovationFileContextTypeEnum.INNOVATION, undefined],
        [InnovationFileContextTypeEnum.INNOVATION_SECTION, 'UNDERSTANDING_OF_NEEDS']
      ])(
        'should create a file with context type %s',
        async (contextType: InnovationFileContextTypeEnum, contextId: string | undefined) => {
          const data = {
            context: { id: contextId ?? innovation.id, type: contextType },
            name: randFileName(),
            file: {
              id: randFileName(),
              name: randFileName(),
              size: randNumber(),
              extension: 'pdf'
            }
          };

          const file = await sut.createFile(
            DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
            innovation.id,
            data,
            em
          );

          const dbFile = await em
            .createQueryBuilder(InnovationFileEntity, 'file')
            .where('file.id = :fileId', { fileId: file.id })
            .getOne();

          expect(file).toHaveProperty('id');
          expect(dbFile).toMatchObject({
            name: data.name,
            storageId: data.file.id,
            filename: data.file.name,
            filesize: data.file.size,
            extension: data.file.extension,
            contextId: data.context.id,
            contextType: data.context.type,
            createdBy: innovationOwner.id
          });
        }
      );
    });

    describe('When I create a file as an NA', () => {
      let naDomainContext: DomainContextType;

      beforeAll(() => {
        naDomainContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');
      });

      it('should create a file with context type INNOVATION', async () => {
        const data = {
          context: { id: innovation.id, type: InnovationFileContextTypeEnum.INNOVATION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        const file = await sut.createFile(naDomainContext, innovation.id, data, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.id = :fileId', { fileId: file.id })
          .getOne();

        expect(file).toHaveProperty('id');
        expect(dbFile).toMatchObject({
          name: data.name,
          storageId: data.file.id,
          filename: data.file.name,
          filesize: data.file.size,
          extension: data.file.extension,
          contextId: data.context.id,
          contextType: data.context.type,
          createdBy: naDomainContext.id
        });
      });

      it('should throw error when creating file with context type INNOVATION_SECTION', async () => {
        const data = {
          context: { id: 'TESTING_WITH_USERS', type: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(naDomainContext, innovation.id, data, em)).rejects.toThrowError(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });
    });

    describe('When I create a file as an QA/A', () => {
      let qaDomainContext: DomainContextType;

      beforeAll(() => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        qaDomainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      });

      it('should create a file with context type INNOVATION', async () => {
        const data = {
          context: { id: innovation.id, type: InnovationFileContextTypeEnum.INNOVATION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        const file = await sut.createFile(qaDomainContext, innovation.id, data, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.id = :fileId', { fileId: file.id })
          .getOne();

        expect(file).toHaveProperty('id');
        expect(dbFile).toMatchObject({
          name: data.name,
          storageId: data.file.id,
          filename: data.file.name,
          filesize: data.file.size,
          extension: data.file.extension,
          contextId: data.context.id,
          contextType: data.context.type,
          createdBy: qaDomainContext.id
        });
      });

      it('should throw error when creating file with context type INNOVATION_SECTION', async () => {
        const data = {
          context: { id: 'TESTING_WITH_USERS', type: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(qaDomainContext, innovation.id, data, em)).rejects.toThrowError(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });
    });
  });

  describe('deleteFile()', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    describe.each([
      ['innovation owner', DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole')],
      ['innovation collaborator', DTOsHelper.getUserRequestContext(scenario.users.janeInnovator, 'innovatorRole')]
    ])('When I delete a file as an %s', (_: string, domainContext: DomainContextType) => {
      it.each([
        ['the owner', innovation.files.sectionFileByJohn.id],
        ['a collaborator', innovation.files.sectionFileByJane.id]
      ])('should be able to delete a file created by %s', async (_: string, fileId: string) => {
        await sut.deleteFile(domainContext, fileId, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .withDeleted()
          .where('file.id = :fileId', { fileId })
          .getOne();

        expect(dbFile?.deletedAt).toBeTruthy();
      });

      it.each([
        ['NA', innovation.files.innovationFileByPaul.id],
        ['QA', innovation.files.innovationFileByAlice.id],
        ['A', innovation.files.innovationFileByIngrid.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrowError(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE)
        );
      });
    });

    describe.each([
      ['QA', DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole')],
      ['A', DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole')]
    ])('When I delete a file as an %s', (_: string, domainContext: DomainContextType) => {
      it.each([
        ['myself', innovation.files.innovationFileByAlice.id],
        ['an QA/A from the same unit', innovation.files.innovationFileByIngrid.id]
      ])('should be able to delete a file created by %s', async (_: string, fileId: string) => {
        await sut.deleteFile(domainContext, fileId, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .withDeleted()
          .where('file.id = :fileId', { fileId })
          .getOne();

        expect(dbFile?.deletedAt).toBeTruthy();
      });

      it.each([
        ['QA/A from other unit', innovation.files.innovationFileByJamieWithAiRole.id],
        ['innovation owner', innovation.files.sectionFileByJohn.id],
        ['innovation collaborator', innovation.files.sectionFileByJane.id],
        ['NA', innovation.files.innovationFileByPaul.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrowError(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE)
        );
      });
    });

    describe('When I delete a file as an NA', () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');

      it.each([
        ['myself', innovation.files.innovationFileByPaul.id],
        ['another NA', innovation.files.innovationFileBySean.id]
      ])('should be able to delete a file created by %s', async (_: string, fileId: string) => {
        await sut.deleteFile(domainContext, fileId, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .withDeleted()
          .where('file.id = :fileId', { fileId })
          .getOne();

        expect(dbFile?.deletedAt).toBeTruthy();
      });

      it.each([
        ['QA', innovation.files.innovationFileByAlice.id],
        ['A', innovation.files.innovationFileByIngrid.id],
        ['innovation owner', innovation.files.sectionFileByJohn.id],
        ['innovation collaborator', innovation.files.sectionFileByJane.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrowError(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE)
        );
      });
    });

    it('should throw an error if the file doesnt exist', async () => {
      await expect(() =>
        sut.deleteFile(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'), randUuid(), em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND));
    });

    it('should throw an error if an admin tries to delete a file', async () => {
      await expect(() =>
        sut.deleteFile(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
          innovation.files.sectionFileByJohn.id,
          em
        )
      ).rejects.toThrowError(new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE));
    });
  });

  describe('getFileUploadUrl', () => {
    it('should return the file upload url', async () => {
      const name = randFileName();
      const url = randUrl();
      const mock = jest.spyOn(FileStorageService.prototype, 'getUploadUrl').mockReturnValue(url);

      const fileUploadUrl = await sut.getFileUploadUrl(name);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(fileUploadUrl).toMatchObject({
        id: expect.any(String),
        name,
        url
      });
    });
  });

  // This will be removed - its currently being used by evidences
  describe('uploadInnovationFile', () => {
    it('should updload an innovation file', async () => {
      const filename = randFileName();
      const url = randUrl();
      jest.spyOn(FileStorageService.prototype, 'getUploadUrl').mockReturnValue(url);

      const file = await sut.uploadInnovationFile(
        scenario.users.johnInnovator.id,
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        filename,
        randText(),
        em
      );

      expect(file).toMatchObject({ id: expect.any(String), displayFileName: filename, url });
    });
  });
});
