import { container } from '../_config';

import { InnovationFileEntity } from '@innovations/shared/entities';
import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { InnovationErrorsEnum, NotFoundError, UnprocessableEntityError } from '@innovations/shared/errors';
import { FileStorageService } from '@innovations/shared/services';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@innovations/shared/tests';
import type { TestFileType } from '@innovations/shared/tests/builders/innovation-file.builder';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { DomainContextType } from '@innovations/shared/types';
import { randFileName, randNumber, randUrl, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

describe('Services / Innovation File service suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let sut: InnovationFileService;
  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
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
          const expected = {
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
            expected,
            em
          );

          const dbFile = await em
            .createQueryBuilder(InnovationFileEntity, 'file')
            .where('file.id = :fileId', { fileId: file.id })
            .getOne();

          expect(file).toHaveProperty('id');
          expect(dbFile).toHaveProperty('name', expected.name);
          expect(dbFile).toHaveProperty('storageId', expected.file.id);
          expect(dbFile).toHaveProperty('filename', expected.file.name);
          expect(dbFile).toHaveProperty('filesize', expected.file.size);
          expect(dbFile).toHaveProperty('extension', expected.file.extension);
          expect(dbFile).toHaveProperty('contextId', expected.context.id);
          expect(dbFile).toHaveProperty('contextType', expected.context.type);
          expect(dbFile).toHaveProperty('createdBy', innovationOwner.id);
        }
      );
    });

    describe('When I create a file as an NA', () => {
      let naDomainContext: DomainContextType;

      beforeAll(() => {
        naDomainContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');
      });

      it('should create a file with context type INNOVATION', async () => {
        const expected = {
          context: { id: innovation.id, type: InnovationFileContextTypeEnum.INNOVATION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        const file = await sut.createFile(naDomainContext, innovation.id, expected, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.id = :fileId', { fileId: file.id })
          .getOne();

        expect(file).toHaveProperty('id');
        expect(dbFile).toHaveProperty('name', expected.name);
        expect(dbFile).toHaveProperty('storageId', expected.file.id);
        expect(dbFile).toHaveProperty('filename', expected.file.name);
        expect(dbFile).toHaveProperty('filesize', expected.file.size);
        expect(dbFile).toHaveProperty('extension', expected.file.extension);
        expect(dbFile).toHaveProperty('contextId', expected.context.id);
        expect(dbFile).toHaveProperty('contextType', expected.context.type);
        expect(dbFile).toHaveProperty('createdBy', naDomainContext.id);
      });

      it('should throw error when creating a innovation section file', async () => {
        const expected = {
          context: { id: 'TESTING_WITH_USERS', type: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(naDomainContext, innovation.id, expected, em)).rejects.toThrowError(
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
        const expected = {
          context: { id: innovation.id, type: InnovationFileContextTypeEnum.INNOVATION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        const file = await sut.createFile(qaDomainContext, innovation.id, expected, em);

        const dbFile = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.id = :fileId', { fileId: file.id })
          .getOne();

        expect(file).toHaveProperty('id');
        expect(dbFile).toHaveProperty('name', expected.name);
        expect(dbFile).toHaveProperty('storageId', expected.file.id);
        expect(dbFile).toHaveProperty('filename', expected.file.name);
        expect(dbFile).toHaveProperty('filesize', expected.file.size);
        expect(dbFile).toHaveProperty('extension', expected.file.extension);
        expect(dbFile).toHaveProperty('contextId', expected.context.id);
        expect(dbFile).toHaveProperty('contextType', expected.context.type);
        expect(dbFile).toHaveProperty('createdBy', qaDomainContext.id);
      });

      it('should throw error when creating a innovation section file', async () => {
        const expected = {
          context: { id: 'TESTING_WITH_USERS', type: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(qaDomainContext, innovation.id, expected, em)).rejects.toThrowError(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });
    });
  });

  // describe('uploadInnovationFile', () => {
  //   it('should updload an innovation file', async () => {
  //     const filename = randText();

  //     const file = await sut.uploadInnovationFile(
  //       testData.baseUsers.innovator.id,
  //       testData.innovation.id,
  //       filename,
  //       randText(),
  //       em
  //     );

  //     expect(file.id).toBeDefined();
  //     expect(file.displayFileName).toBe(filename);
  //   });
  // });
});
