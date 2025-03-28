import { container } from '../_config';

import { MAX_FILES_ALLOWED } from '@innovations/shared/constants';
import { InnovationEntity, InnovationFileEntity } from '@innovations/shared/entities';
import {
  InnovationFileContextTypeEnum,
  InnovationStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@innovations/shared/enums';
import {
  ConflictError,
  ForbiddenError,
  InnovationErrorsEnum,
  NotFoundError,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { FileStorageService, NotifierService } from '@innovations/shared/services';
import { AuthErrorsEnum } from '@innovations/shared/services/auth/authorization-validation.model';
import type { CompleteScenarioType } from '@innovations/shared/tests';
import { MocksHelper, TestsHelper } from '@innovations/shared/tests';
import { InnovationFileBuilder, type TestFileType } from '@innovations/shared/tests/builders/innovation-file.builder';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import type { DomainContextType } from '@innovations/shared/types';
import { randAirportName, randFileName, randFutureDate, randNumber, randText, randUrl, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import type { InnovationFileService } from './innovation-file.service';
import SYMBOLS from './symbols';

describe('Services / Innovation File service suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let sut: InnovationFileService;
  let em: EntityManager;

  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  const notifierSendNotifyMeSpy = jest.spyOn(NotifierService.prototype, 'sendNotifyMe').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    notifierSendNotifyMeSpy.mockClear();
  });

  describe('getFilesList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

    it('should return the list of files without using filters and fields, paginated and orded by name', async () => {
      const firstFileOrderedByName = { file: innovation.files.sectionFileByJohn, url: randUrl() };
      const secondFileOrderedByName = { file: innovation.files.innovationFileByIngrid, url: randUrl() };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(firstFileOrderedByName.url)
        .mockReturnValueOnce(secondFileOrderedByName.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        {},
        { take: 2, skip: 0, order: { name: 'ASC' } },
        em
      );

      expect(files).toMatchObject({
        count: Object.keys(innovation.files).length,
        data: [
          transformFileData(firstFileOrderedByName.file, firstFileOrderedByName.url, {
            name: scenario.users.johnInnovator.name,
            role: ServiceRoleEnum.INNOVATOR,
            isOwner: true
          }),
          transformFileData(secondFileOrderedByName.file, secondFileOrderedByName.url, {
            name: scenario.users.ingridAccessor.name,
            role: ServiceRoleEnum.ACCESSOR,
            orgUnitName: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
          })
        ]
      });
    });

    it('should return a file filtered by name', async () => {
      const paulFile = { file: innovation.files.innovationFileByPaul, url: randUrl() };

      jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValueOnce(paulFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { name: paulFile.file.name },
        { take: 20, skip: 0, order: { name: 'ASC' } },
        em
      );

      expect(files).toMatchObject({
        count: 1,
        data: [
          transformFileData(paulFile.file, paulFile.url, {
            name: scenario.users.paulNeedsAssessor.name,
            role: ServiceRoleEnum.ASSESSMENT
          })
        ]
      });
    });

    it('should return the list of files filtered by uploaded by', async () => {
      const innovationOwnerFile = { file: innovation.files.sectionFileByJohn, url: randUrl() };
      const johnInnovationEvidenceFileByJohn = { file: innovation.files.evidenceFileByJohn, url: randUrl() };
      const innovationCollaboratorFile = { file: innovation.files.sectionFileByJane, url: randUrl() };
      const innovationDeletedUserFile = { file: innovation.files.innovationFileByDeletedUser, url: randUrl() };
      const innovationCreatedAfterTodayFile = {
        file: innovation.files.innovationFileUploadedAfterToday,
        url: randUrl()
      };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationOwnerFile.url)
        .mockReturnValueOnce(johnInnovationEvidenceFileByJohn.url)
        .mockReturnValueOnce(innovationCollaboratorFile.url)
        .mockReturnValueOnce(innovationDeletedUserFile.url)
        .mockReturnValueOnce(innovationCreatedAfterTodayFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { uploadedBy: [ServiceRoleEnum.INNOVATOR] },
        { take: 20, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationOwnerFile.file, innovationOwnerFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(johnInnovationEvidenceFileByJohn.file, johnInnovationEvidenceFileByJohn.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(innovationCollaboratorFile.file, innovationCollaboratorFile.url, {
          name: scenario.users.janeInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: false
        }),
        transformFileData(innovationDeletedUserFile.file, innovationDeletedUserFile.url, {
          name: '[deleted user]',
          role: ServiceRoleEnum.INNOVATOR
        }),
        transformFileData(innovationCreatedAfterTodayFile.file, innovationCreatedAfterTodayFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        })
      ];

      expect(files).toMatchObject({
        count: data.length,
        data: data
      });
    });

    it('should return the list of files filtered by uploaded context type', async () => {
      const innovationOwnerFile = { file: innovation.files.sectionFileByJohn, url: randUrl() };
      const innovationCollaboratorFile = { file: innovation.files.sectionFileByJane, url: randUrl() };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationOwnerFile.url)
        .mockReturnValueOnce(innovationCollaboratorFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { contextTypes: [InnovationFileContextTypeEnum.INNOVATION_SECTION] },
        { take: 2, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationOwnerFile.file, innovationOwnerFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(innovationCollaboratorFile.file, innovationCollaboratorFile.url, {
          name: scenario.users.janeInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: false
        })
      ];

      expect(files).toMatchObject({
        count: data.length,
        data: data
      });
    });

    it('should return the list of files filtered by uploaded context id', async () => {
      const innovationFileByPaul = { file: innovation.files.innovationFileByPaul, url: randUrl() };
      const innovationFileBySean = { file: innovation.files.innovationFileBySean, url: randUrl() };
      const innovationFileByAlice = { file: innovation.files.innovationFileByAlice, url: randUrl() };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationFileByPaul.url)
        .mockReturnValueOnce(innovationFileBySean.url)
        .mockReturnValueOnce(innovationFileByAlice.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { contextId: innovation.id },
        { take: 3, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationFileByPaul.file, innovationFileByPaul.url, {
          name: scenario.users.paulNeedsAssessor.name,
          role: ServiceRoleEnum.ASSESSMENT
        }),
        transformFileData(innovationFileBySean.file, innovationFileBySean.url, {
          name: scenario.users.seanNeedsAssessor.name,
          role: ServiceRoleEnum.ASSESSMENT
        }),
        transformFileData(innovationFileByAlice.file, innovationFileByAlice.url, {
          name: scenario.users.aliceQualifyingAccessor.name,
          role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
          orgUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        })
      ];

      const filesCount = await em
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('file.contextId = :contextId', { contextId: innovation.id })
        .getCount();

      expect(files).toMatchObject({
        count: filesCount,
        data: data
      });
    });

    it('should return the list of files filtered by uploaded organisations', async () => {
      const innovationMessageFileByAlice = { file: innovation.files.messageFileByAlice, url: randUrl() };
      const innovationFileByAlice = { file: innovation.files.innovationFileByAlice, url: randUrl() };
      const innovationFileByIngrid = { file: innovation.files.innovationFileByIngrid, url: randUrl() };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationMessageFileByAlice.url)
        .mockReturnValueOnce(innovationFileByAlice.url)
        .mockReturnValueOnce(innovationFileByIngrid.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { units: [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id] },
        { take: 3, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationMessageFileByAlice.file, innovationMessageFileByAlice.url, {
          name: scenario.users.aliceQualifyingAccessor.name,
          role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
          orgUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        }),
        transformFileData(innovationFileByAlice.file, innovationFileByAlice.url, {
          name: scenario.users.aliceQualifyingAccessor.name,
          role: ServiceRoleEnum.QUALIFYING_ACCESSOR,
          orgUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        }),
        transformFileData(innovationFileByIngrid.file, innovationFileByIngrid.url, {
          name: scenario.users.ingridAccessor.name,
          role: ServiceRoleEnum.ACCESSOR,
          orgUnitName: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        })
      ];

      expect(files).toMatchObject({
        count: expect.any(Number),
        data: data
      });
    });

    it('should return a file filtered by created at date', async () => {
      const futureFile = { file: innovation.files.innovationFileUploadedAfterToday, url: randUrl() };

      jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValueOnce(futureFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        {
          dateFilter: [
            {
              field: 'createdAt',
              startDate: new Date(),
              endDate: randFutureDate()
            }
          ]
        },
        { take: 20, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(futureFile.file, futureFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        })
      ];

      expect(files).toMatchObject({
        count: data.length,
        data: data
      });
    });

    it("should return a file with the createdBy name as 'deleted user' when createdBy user was deleted", async () => {
      const innovationDeletedUserFile = { file: innovation.files.innovationFileByDeletedUser, url: randUrl() };

      jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValueOnce(innovationDeletedUserFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { name: innovationDeletedUserFile.file.name },
        { take: 20, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationDeletedUserFile.file, innovationDeletedUserFile.url, {
          name: '[deleted user]',
          role: ServiceRoleEnum.INNOVATOR
        })
      ];

      expect(files).toMatchObject({
        count: data.length,
        data: data
      });
    });

    it('should return files order by createdAt', async () => {
      const innovationOwnerFile = { file: innovation.files.sectionFileByJohn, url: randUrl() };
      const evidenceFileByJohn = { file: innovation.files.evidenceFileByJohn, url: randUrl() };
      const innovationCollaboratorFile = { file: innovation.files.sectionFileByJane, url: randUrl() };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationOwnerFile.url)
        .mockReturnValueOnce(evidenceFileByJohn.url)
        .mockReturnValueOnce(innovationCollaboratorFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { uploadedBy: [ServiceRoleEnum.INNOVATOR] },
        { take: 3, skip: 0, order: { createdAt: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationOwnerFile.file, innovationOwnerFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(evidenceFileByJohn.file, evidenceFileByJohn.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(innovationCollaboratorFile.file, innovationCollaboratorFile.url, {
          name: scenario.users.janeInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: false
        })
      ];

      expect(files).toMatchObject({
        count: expect.any(Number),
        data: data
      });
    });

    it('should return files order by contextType', async () => {
      const innovationOwnerFile = { file: innovation.files.sectionFileByJohn, url: randUrl() };
      const innovationDeletedUserFile = { file: innovation.files.innovationFileByDeletedUser, url: randUrl() };
      const evidenceFileByJohn = { file: innovation.files.evidenceFileByJohn, url: randUrl() };
      const innovationCreatedAfterTodayFile = {
        file: innovation.files.innovationFileUploadedAfterToday,
        url: randUrl()
      };

      jest
        .spyOn(FileStorageService.prototype, 'getDownloadUrl')
        .mockReturnValueOnce(innovationDeletedUserFile.url)
        .mockReturnValueOnce(innovationCreatedAfterTodayFile.url)
        .mockReturnValueOnce(evidenceFileByJohn.url)
        .mockReturnValueOnce(innovationOwnerFile.url);

      const files = await sut.getFilesList(
        context,
        innovation.id,
        { uploadedBy: [ServiceRoleEnum.INNOVATOR] },
        { take: 4, skip: 0, order: { contextType: 'ASC' } },
        em
      );

      const data = [
        transformFileData(innovationDeletedUserFile.file, innovationDeletedUserFile.url, {
          name: '[deleted user]',
          role: ServiceRoleEnum.INNOVATOR
        }),
        transformFileData(innovationCreatedAfterTodayFile.file, innovationCreatedAfterTodayFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(evidenceFileByJohn.file, evidenceFileByJohn.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        }),
        transformFileData(innovationOwnerFile.file, innovationOwnerFile.url, {
          name: scenario.users.johnInnovator.name,
          role: ServiceRoleEnum.INNOVATOR,
          isOwner: true
        })
      ];

      expect(files).toMatchObject({
        count: expect.any(Number),
        data: data
      });
    });

    it('should return an empty array when no files are found', async () => {
      const files = await sut.getFilesList(
        context,
        innovation.id,
        { name: randAirportName() },
        { take: 20, skip: 0, order: { name: 'ASC' } },
        em
      );

      expect(files.count).toBe(0);
      expect(files.data).toHaveLength(0);
    });

    describe('archived innovations', () => {
      const mock = jest.spyOn(FileStorageService.prototype, 'getDownloadUrl').mockReturnValue(randUrl());
      const innovationFiles = scenario.users.johnInnovator.innovations.johnInnovation.files;

      beforeEach(async () => {
        await em.update(
          InnovationEntity,
          { id: innovation.id },
          { status: InnovationStatusEnum.ARCHIVED, statusUpdatedAt: new Date() }
        );
      });

      afterAll(() => {
        mock.mockRestore();
      });

      it.each([
        ['innovator', scenario.users.johnInnovator],
        ['admin', scenario.users.allMighty]
      ])('should return the list of all files for an archived innovation as %s', async (_label, user) => {
        const files = await sut.getFilesList(
          DTOsHelper.getUserRequestContext(user),
          innovation.id,
          {},
          { take: 20, skip: 0, order: { name: 'ASC' } },
          em
        );
        expect(files.data.length).toBe(Object.values(innovationFiles).length);
      });

      it.each([
        ['qualifying accessor', scenario.users.aliceQualifyingAccessor],
        ['accessor', scenario.users.samAccessor],
        ['needs assessment', scenario.users.paulNeedsAssessor]
      ])('should exclude files uploaded after archive for A/QA/NA roles', async (_label, user) => {
        const files = await sut.getFilesList(
          DTOsHelper.getUserRequestContext(user),
          innovation.id,
          {},
          { take: 20, skip: 0, order: { name: 'ASC' } },
          em
        );
        // there is one file in the future so it's after the archive (now)
        expect(files.data.length).toBe(Object.values(innovationFiles).length - 1);
        expect(files.data.some(f => f.id === innovationFiles.innovationFileUploadedAfterToday.id)).toBe(false);
      });
    });
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
            context: file.context as any,
            file: {
              name: file.file.name,
              size: file.file.size,
              extension: file.file.extension,
              url: randomUrl
            },
            createdAt: new Date(file.createdAt),
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

    describe('When innovation is archived', () => {
      beforeEach(async () => {
        await em.update(InnovationEntity, { id: innovation.id }, { status: InnovationStatusEnum.ARCHIVED });
      });

      it('should allow delete if is from an innovator and is a section file', async () => {
        const file = userMap.get('johnInnovator')!.file;
        const result = await sut.getFileInfo(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          innovation.id,
          file.id,
          em
        );
        expect(result.canDelete).toBe(true);
      });

      it('should not allow deletion if is not an innovator', async () => {
        const file = userMap.get('johnInnovator')!.file;
        const result = await sut.getFileInfo(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          file.id,
          em
        );
        expect(result.canDelete).toBe(false);
      });
    });

    describe('As any role', () => {
      describe("when I request a file information about a file that doesn't exist", () => {
        it('should return a not found error', async () => {
          const domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
          const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

          await expect(() => sut.getFileInfo(domainContext, innovation.id, randUuid(), em)).rejects.toThrow(
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
            context: file.context as any,
            file: {
              name: file.file.name,
              size: file.file.size,
              extension: file.file.extension,
              url: randomUrl
            },
            createdAt: new Date(file.createdAt),
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
            innovation.status,
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

      it("should throw error if the section doesn't allow upload before submitting to NA", async () => {
        const data = {
          context: { id: 'INNOVATION_DESCRIPTION', type: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() =>
          sut.createFile(
            DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
            innovation.id,
            data,
            InnovationStatusEnum.CREATED,
            em
          )
        ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_FILE_FORBIDDEN_SECTION));
      });

      it.each([
        [InnovationFileContextTypeEnum.INNOVATION_SECTION, 'INNOVATION_DESCRIPTION'],
        [InnovationFileContextTypeEnum.INNOVATION_EVIDENCE, randUuid()]
      ])('should allow uploading %s if the innovation is archived', async (type, id) => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovationArchived;
        const data = {
          context: { id, type },
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
          innovation.status,
          em
        );

        expect(file).toHaveProperty('id');
      });

      it("shouldn't allow uploading other files if the innovation is archived", async () => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovationArchived;
        const data = {
          context: { type: InnovationFileContextTypeEnum.INNOVATION, id: '' },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() =>
          sut.createFile(
            DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
            scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
            data,
            innovation.status,
            em
          )
        ).rejects.toThrow(new ConflictError(AuthErrorsEnum.AUTH_INNOVATION_ARCHIVED_CONFLICT));
      });

      it('should send the notifyMe notification', async () => {
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

        await sut.createFile(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
          innovation.id,
          data,
          innovation.status,
          em
        );

        expect(notifierSendNotifyMeSpy).toHaveBeenCalledTimes(1);
        expect(notifierSendNotifyMeSpy).toHaveBeenCalledWith(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
          innovation.id,
          'DOCUMENT_UPLOADED',
          {
            documentName: data.name
          }
        );
      });
    });

    describe('When I create a file as an NA', () => {
      let naDomainContext: DomainContextType;

      beforeAll(() => {
        naDomainContext = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');
      });

      it('should create a file with context type INNOVATION and send a notification', async () => {
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

        const file = await sut.createFile(naDomainContext, innovation.id, data, innovation.status, em);

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
        expect(notifierSendSpy).toHaveBeenCalledWith(naDomainContext, NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED, {
          innovationId: innovation.id,
          file: { id: file.id }
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

        await expect(() => sut.createFile(naDomainContext, innovation.id, data, innovation.status, em)).rejects.toThrow(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });

      it('should throw error when creating file with context type INNOVATION_EVIDENCE', async () => {
        const data = {
          context: { id: randUuid(), type: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(naDomainContext, innovation.id, data, innovation.status, em)).rejects.toThrow(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_EVIDENCE_MUST_BE_UPLOADED_BY_INNOVATOR
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

      it('should create a file with context type INNOVATION and send notification', async () => {
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

        const file = await sut.createFile(qaDomainContext, innovation.id, data, innovation.status, em);

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
        expect(notifierSendSpy).toHaveBeenCalledWith(qaDomainContext, NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED, {
          innovationId: innovation.id,
          file: { id: file.id }
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

        await expect(() => sut.createFile(qaDomainContext, innovation.id, data, innovation.status, em)).rejects.toThrow(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_SECTION_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });

      it('should throw error when creating file with context type INNOVATION_EVIDENCE', async () => {
        const data = {
          context: { id: randUuid(), type: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE },
          name: randFileName(),
          file: {
            id: randFileName(),
            name: randFileName(),
            size: randNumber(),
            extension: 'pdf'
          }
        };

        await expect(() => sut.createFile(qaDomainContext, innovation.id, data, innovation.status, em)).rejects.toThrow(
          new UnprocessableEntityError(
            InnovationErrorsEnum.INNOVATION_FILE_ON_INNOVATION_EVIDENCE_MUST_BE_UPLOADED_BY_INNOVATOR
          )
        );
      });
    });

    it('should throw an error if the max allowed files per innovation is reached', async () => {
      const johnInnovator = scenario.users.johnInnovator;

      for (let i = 0; i < MAX_FILES_ALLOWED; i++) {
        await new InnovationFileBuilder(em)
          .setContext({
            id: 'INNOVATION_DESCRIPTION',
            type: InnovationFileContextTypeEnum.INNOVATION_SECTION
          })
          .setCreatedByUserRole(johnInnovator.roles['innovatorRole']!.id)
          .setInnovation(innovation.id)
          .save();
      }

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

      await expect(() =>
        sut.createFile(
          DTOsHelper.getUserRequestContext(johnInnovator, 'innovatorRole'),
          innovation.id,
          data,
          innovation.status,
          em
        )
      ).rejects.toThrow(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_MAX_ALLOWED_FILES_REACHED));
    });
  });

  describe('deleteFile()', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const deleteFileMock = jest.spyOn(FileStorageService.prototype, 'deleteFile').mockResolvedValue({} as any);

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
        expect(deleteFileMock).toHaveBeenCalled();
      });

      it.each([
        ['NA', innovation.files.innovationFileByPaul.id],
        ['QA', innovation.files.innovationFileByAlice.id],
        ['A', innovation.files.innovationFileByIngrid.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrow(
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
        expect(deleteFileMock).toHaveBeenCalled();
      });

      it.each([
        ['QA/A from other unit', innovation.files.innovationFileByJamieWithAiRole.id],
        ['innovation owner', innovation.files.sectionFileByJohn.id],
        ['innovation collaborator', innovation.files.sectionFileByJane.id],
        ['NA', innovation.files.innovationFileByPaul.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrow(
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
        expect(deleteFileMock).toHaveBeenCalled();
      });

      it.each([
        ['QA', innovation.files.innovationFileByAlice.id],
        ['A', innovation.files.innovationFileByIngrid.id],
        ['innovation owner', innovation.files.sectionFileByJohn.id],
        ['innovation collaborator', innovation.files.sectionFileByJane.id]
      ])('should throw an error if the file was created by a %s', async (_: string, fileId: string) => {
        await expect(() => sut.deleteFile(domainContext, fileId, em)).rejects.toThrow(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE)
        );
      });
    });

    describe('when Innovator deletes archived innovation file', () => {
      const sectionFile = innovation.files.sectionFileByJohn.id;
      const evidenceFile = innovation.files.evidenceFileByJohn.id;
      const notSectionFile = innovation.files.innovationFileByDeletedUser.id;
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      it("should delete the file if it's a section file", async () => {
        await em.update(InnovationEntity, { id: innovation.id }, { status: InnovationStatusEnum.ARCHIVED });
        await sut.deleteFile(domainContext, sectionFile, em);
      });

      it("should delete the file if it's a evidence file", async () => {
        await em.update(InnovationEntity, { id: innovation.id }, { status: InnovationStatusEnum.ARCHIVED });
        await sut.deleteFile(domainContext, evidenceFile, em);
      });

      it('should fail if the file is not a section file', async () => {
        await em.update(InnovationEntity, { id: innovation.id }, { status: InnovationStatusEnum.ARCHIVED });
        await expect(() => sut.deleteFile(domainContext, notSectionFile, em)).rejects.toThrow(
          new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE)
        );
      });
    });

    describe('deleteFiles()', () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      it('should delete all files related to the contextType INNOVATION_SECTION', async () => {
        const nInnovationSectionFilesBefore = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.contextType = :contextType', { contextType: InnovationFileContextTypeEnum.INNOVATION_SECTION })
          .andWhere('file.innovation_id = :innovationId', { innovationId: innovation.id })
          .getCount();

        await sut.deleteFiles(
          domainContext,
          innovation.id,
          { contextType: InnovationFileContextTypeEnum.INNOVATION_SECTION },
          em
        );

        const nInnovationSectionFilesAfter = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.contextType = :contextType', { contextType: InnovationFileContextTypeEnum.INNOVATION_SECTION })
          .andWhere('file.innovation_id = :innovationId', { innovationId: innovation.id })
          .getCount();

        expect(nInnovationSectionFilesBefore).toBeGreaterThan(0);
        expect(nInnovationSectionFilesAfter).toBe(0);
      });

      it('should delete all files related to a specific contextId like for section INNOVATION_DESCRIPTION', async () => {
        const contextId = innovation.files.sectionFileByJohn.context.id;
        const nInnovationSectionFilesBefore = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.contextId = :contextId', { contextId })
          .andWhere('file.innovation_id = :innovationId', { innovationId: innovation.id })
          .getCount();

        await sut.deleteFiles(domainContext, innovation.id, { contextId }, em);

        const nInnovationSectionFilesAfter = await em
          .createQueryBuilder(InnovationFileEntity, 'file')
          .where('file.contextId = :contextId', { contextId })
          .andWhere('file.innovation_id = :innovationId', { innovationId: innovation.id })
          .getCount();

        expect(nInnovationSectionFilesBefore).toBeGreaterThan(0);
        expect(nInnovationSectionFilesAfter).toBe(0);
      });
    });

    it('should throw an error if the file doesnt exist', async () => {
      await expect(() =>
        sut.deleteFile(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'), randUuid(), em)
      ).rejects.toThrow(new NotFoundError(InnovationErrorsEnum.INNOVATION_FILE_NOT_FOUND));
    });

    it('should throw an error if an admin tries to delete a file', async () => {
      await expect(() =>
        sut.deleteFile(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
          innovation.files.sectionFileByJohn.id,
          em
        )
      ).rejects.toThrow(new ForbiddenError(InnovationErrorsEnum.INNOVATION_FILE_NO_PERMISSION_TO_DELETE));
    });
  });

  describe('getFileUploadUrl', () => {
    const url = randUrl();
    const mock = jest.spyOn(FileStorageService.prototype, 'getUploadUrl').mockReturnValue(url);
    afterEach(() => {
      mock.mockClear();
    });
    it('should return the file upload url', async () => {
      const name = randFileName();
      const fileUploadUrl = await sut.getFileUploadUrl(name);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(fileUploadUrl).toMatchObject({
        id: expect.any(String),
        name,
        url
      });
    });

    it('should strip the filename to 100 characters if filename too big', async () => {
      const name = randText({ charCount: 200 }) + '.pdf';
      const fileUploadName = (await sut.getFileUploadUrl(name)).name;

      expect(fileUploadName).toHaveLength(100);
      expect(fileUploadName).toMatch(/\.pdf$/);
    });
  });

  // Helper
  const transformFileData = (
    file: TestFileType,
    url: string,
    createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string }
  ): {
    id: string;
    storageId: string;
    context: { id: string; type: InnovationFileContextTypeEnum };
    name: string;
    createdAt: Date;
    createdBy: { name: string; role: ServiceRoleEnum; isOwner?: boolean; orgUnitName?: string };
    file: {
      name: string;
      size?: number;
      extension: string;
      url: string;
    };
  } => {
    return {
      id: file.id,
      storageId: file.storageId,
      context: file.context,
      name: file.name,
      createdAt: new Date(file.createdAt),
      createdBy,
      file: { ...file.file, url }
    };
  };

  describe('messageContextMapper', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should resolve a map with all ', async () => {
      const files = [
        innovation.files.sectionFileByJohn,
        innovation.files.sectionFileByJane,
        innovation.files.progressUpdateFileByIngrid,
        innovation.files.innovationFileByPaul, // Uploaded
        innovation.files.innovationFileBySean, // Uploaded
        innovation.files.evidenceFileByJohn,
        innovation.files.messageFileByAlice
      ];

      const filesParameter = files.map(f => ({
        id: f.id,
        contextType: f.context.type,
        contextId: f.context.id
      }));

      const keys = sut['contextTypeId2Key'];

      const res = await sut['files2ResolvedContexts'](
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        filesParameter,
        innovation.id,
        em
      );
      const expected = new Map();
      files.forEach(f => {
        const { type, id } = f.context;
        const value = { id, type } as any;
        switch (f.id) {
          case innovation.files.evidenceFileByJohn.id:
            value['name'] = innovation.evidences?.[0]?.description;
            break;
          case innovation.files.messageFileByAlice.id:
            value['name'] = innovation.threads.threadByAliceQA.subject;
            value['threadId'] = innovation.threads.threadByAliceQA.id;
            break;
        }
        expected.set(keys(type, id), value);
      });

      expect(res).toMatchObject(expected);
    });
  });
});
