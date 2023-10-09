/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import {
  InnovationFileEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  InnovationTaskEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity
} from '@innovations/shared/entities';
import {
  InnovationFileContextTypeEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotificationContextTypeEnum
} from '@innovations/shared/enums';
import {
  BadRequestError,
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationSupportLogBuilder } from '@innovations/shared/tests/builders/innovation-support-log.builder';
import { InnovationSupportBuilder } from '@innovations/shared/tests/builders/innovation-support.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randFileExt, randFileName, randNumber, randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { InnovationFileService } from './innovation-file.service';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation-supports suite', () => {
  let sut: InnovationSupportsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  // Setup global mocks for these tests
  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  const threadMessageMock = jest.spyOn(InnovationThreadsService.prototype, 'createThreadMessage').mockResolvedValue({
    threadMessage: InnovationThreadMessageEntity.new({ id: randUuid() })
  });

  beforeAll(async () => {
    sut = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockReset();
    supportLogSpy.mockReset();
    notifierSendSpy.mockReset();
    threadMessageMock.mockReset();
  });

  describe('getInnovationSupportsList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    const getUnreadNotificationsMock = jest
      .spyOn(DomainInnovationsService.prototype, 'getUnreadNotifications')
      .mockImplementation((_userId, contextIds) => {
        return Promise.resolve(
          contextIds.map(contextId => ({
            contextId,
            contextType: NotificationContextTypeEnum.TASK,
            id: randUuid(),
            params: {}
          }))
        );
      });

    afterAll(() => {
      getUnreadNotificationsMock.mockRestore();
    });

    it('should list all innovation supports', async () => {
      const supports = await sut.getInnovationSupportsList(innovation.id, { fields: [] }, em);

      expect(supports).toMatchObject([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          }
        },
        {
          id: innovation.supports.supportByHealthOrgAiUnit.id,
          status: innovation.supports.supportByHealthOrgAiUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          }
        },
        {
          id: innovation.supports.supportByMedTechOrgUnit.id,
          status: innovation.supports.supportByMedTechOrgUnit.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          }
        }
      ]);
    });

    it('should list all innovation supports with engaging accessors', async () => {
      const supports = await sut.getInnovationSupportsList(innovation.id, { fields: ['engagingAccessors'] }, em);

      expect(supports).toMatchObject([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.aliceQualifyingAccessor.id,
              userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
              name: scenario.users.aliceQualifyingAccessor.name
            },
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id,
              name: scenario.users.jamieMadroxAccessor.name
            }
          ]
        },
        {
          id: innovation.supports.supportByHealthOrgAiUnit.id,
          status: innovation.supports.supportByHealthOrgAiUnit.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          },
          engagingAccessors: []
        },
        {
          id: innovation.supports.supportByMedTechOrgUnit.id,
          status: innovation.supports.supportByMedTechOrgUnit.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.samAccessor.id,
              userRoleId: scenario.users.samAccessor.roles.accessorRole.id,
              name: scenario.users.samAccessor.name
            }
          ]
        }
      ]);
    });

    it(`should throw a not found error when the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportsList(randUuid(), { fields: [] }, em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationSupportInfo', () => {
    it('should get the innovation support info', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = await sut.getInnovationSupportInfo(innovation.supports.supportByHealthOrgUnit.id, em);

      expect(support).toMatchObject({
        id: innovation.supports.supportByHealthOrgUnit.id,
        status: innovation.supports.supportByHealthOrgUnit.status,
        engagingAccessors: [
          {
            id: scenario.users.aliceQualifyingAccessor.id,
            userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            name: scenario.users.aliceQualifyingAccessor.name
          },
          {
            id: scenario.users.jamieMadroxAccessor.id,
            userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id,
            name: scenario.users.jamieMadroxAccessor.name
          }
        ]
      });
    });

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() => sut.getInnovationSupportInfo(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND)
      );
    });
  });

  describe('createInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create a support', async () => {
      const support = await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        scenario.users.adamInnovator.innovations.adamInnovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.aiRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({
        id: support.id
      });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(supportLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
    });

    it('should throw an unprocessable entity error if the domain context has an invalid organisation unit id', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT)
      );
    });

    it(`should throw a not found error if the organisation unit doesn't exist`, async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor);
      if (domainContext.organisation?.organisationUnit) {
        domainContext.organisation.organisationUnit.id = randUuid();
      }

      await expect(() =>
        sut.createInnovationSupport(
          domainContext,
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should throw an unprocessable entity error if the support already exists', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS));
    });

    it('should throw an unprocessable entity error if the accessors argument exists and the status is not ENGAGING', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.UNASSIGNED,
            message: randText({ charCount: 10 }),
            accessors: [
              {
                id: scenario.users.aliceQualifyingAccessor.id,
                userRoleId: scenario.users.aliceQualifyingAccessor.roles.qaRole.id
              }
            ]
          },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_CANNOT_HAVE_ASSIGNED_ASSESSORS)
      );
    });
  });

  describe('getSupportSummaryList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return currently engaging units', async () => {
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id
      );

      expect(supportSummaryList.ENGAGING).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          support: {
            status: innovation.supports.supportByHealthOrgUnit.status,
            start: expect.any(Date)
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
          support: {
            status: innovation.supports.supportByMedTechOrgUnit.status,
            start: expect.any(Date)
          }
        }
      ]);
      expect(
        supportSummaryList.ENGAGING.every(
          (s, i) => i === 0 || s.support.start! >= supportSummaryList.ENGAGING[i - 1]!.support.start!
        )
      ).toBeTruthy();
    });

    it('should return units that had been engaged', async () => {
      await em
        .getRepository(InnovationSupportEntity)
        .update({ id: innovation.supports.supportByHealthOrgUnit.id }, { status: InnovationSupportStatusEnum.CLOSED });

      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      expect(supportSummaryList.BEEN_ENGAGED).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          support: {
            status: InnovationSupportStatusEnum.CLOSED,
            start: expect.any(Date),
            end: expect.any(Date)
          }
        }
      ]);
    });

    it('should return suggested units', async () => {
      await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.WAITING)
        .setInnovation(innovation.id)
        .setOrganisationUnit(scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.id)
        .save();
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        em
      );

      expect(supportSummaryList.SUGGESTED).toMatchObject([
        {
          id: expect.any(String),
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
          support: {
            status: InnovationSupportStatusEnum.WAITING
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.innovTechOrg.organisationUnits.innovTechHeavyOrgUnit.name,
          support: {
            status: InnovationSupportStatusEnum.WAITING
          }
        },
        {
          id: expect.any(String),
          name: scenario.organisations.innovTechOrg.organisationUnits.innovTechOrgUnit.name,
          support: {
            status: InnovationSupportStatusEnum.UNASSIGNED
          }
        }
      ]);
    });

    it("should return everything empty for innovations that haven't been on NA", async () => {
      const supportSummaryList = await sut.getSupportSummaryList(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        scenario.users.johnInnovator.innovations.johnInnovationEmpty.id,
        em
      );

      expect(supportSummaryList.ENGAGING).toHaveLength(0);
      expect(supportSummaryList.BEEN_ENGAGED).toHaveLength(0);
      expect(supportSummaryList.SUGGESTED).toHaveLength(0);
    });
  });

  describe('getSupportSummaryUnitInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should return the unit information', async () => {
      const jamieMadrox = scenario.users.jamieMadroxAccessor;
      const alice = scenario.users.aliceQualifyingAccessor;
      const paul = scenario.users.paulNeedsAssessor;
      // Suggested by NA
      const naSuggestion = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.ASSESSMENT_SUGGESTION)
        .setCreatedBy(paul, paul.roles.assessmentRole)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id])
        .save();
      // Suggested by QA
      const qaSuggestion = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.ACCESSOR_SUGGESTION)
        .setCreatedBy(alice, alice.roles.qaRole)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setSuggestedUnits([scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id])
        .save();
      // Update status
      const statusUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.STATUS_UPDATE)
        .setCreatedBy(jamieMadrox, jamieMadrox.roles.aiRole)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .save();
      // Create Progress Update
      const progressUpdate = await new InnovationSupportLogBuilder(em)
        .setInnovation(innovation.id)
        .setLogType(InnovationSupportLogTypeEnum.PROGRESS_UPDATE)
        .setSupportStatus(InnovationSupportStatusEnum.ENGAGING)
        .setCreatedBy(jamieMadrox, jamieMadrox.roles.aiRole)
        .setParams({ title: randText() })
        .save();

      const unitInfo = await sut.getSupportSummaryUnitInfo(
        innovation.id,
        scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
        em
      );

      expect(unitInfo).toMatchObject([
        {
          id: progressUpdate.id,
          createdAt: progressUpdate.createdAt,
          createdBy: {
            id: jamieMadrox.id,
            name: jamieMadrox.name,
            displayRole: TranslationHelper.translate(`SERVICE_ROLES.${jamieMadrox.roles.aiRole.role}`)
          },
          type: 'PROGRESS_UPDATE',
          params: { title: progressUpdate.params?.title, message: progressUpdate.description }
        },
        {
          id: statusUpdate.id,
          createdAt: statusUpdate.createdAt,
          createdBy: {
            id: jamieMadrox.id,
            name: jamieMadrox.name,
            displayRole: TranslationHelper.translate(`SERVICE_ROLES.${jamieMadrox.roles.aiRole.role}`)
          },
          type: 'SUPPORT_UPDATE',
          params: { supportStatus: statusUpdate.innovationSupportStatus, message: statusUpdate.description }
        },
        {
          id: qaSuggestion.id,
          createdAt: qaSuggestion.createdAt,
          createdBy: {
            id: alice.id,
            name: alice.name,
            displayRole: TranslationHelper.translate(`SERVICE_ROLES.${alice.roles.qaRole.role}`)
          },
          type: 'SUGGESTED_ORGANISATION',
          params: {
            suggestedByName: alice.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            message: qaSuggestion.description
          }
        },
        {
          id: naSuggestion.id,
          createdAt: naSuggestion.createdAt,
          createdBy: {
            id: paul.id,
            name: paul.name,
            displayRole: TranslationHelper.translate(`SERVICE_ROLES.${paul.roles.assessmentRole.role}`)
          },
          type: 'SUGGESTED_ORGANISATION',
          params: {}
        }
      ]);
      expect(unitInfo.every((s, i) => i === 0 || s.createdAt! <= unitInfo[i - 1]!.createdAt!)).toBeTruthy();
    });

    it("should throw NotFoundError when innovation doesn't exist", async () => {
      await expect(() =>
        sut.getSupportSummaryUnitInfo(
          randUuid(),
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('updateSupportStatus', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it.each([
      InnovationSupportStatusEnum.CLOSED,
      InnovationSupportStatusEnum.UNSUITABLE,
      InnovationSupportStatusEnum.WAITING
    ])('should update the support status to %s', async (status: InnovationSupportStatusEnum) => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        { status: status, message: randText({ charCount: 10 }) },
        em
      );

      expect(support).toMatchObject({ id: support.id });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(supportLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.status).toBe(status);
    });

    it('should add new assigned accessors when status is changed to ENGAGING', async () => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.sarahQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgAiUnit.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText({ charCount: 10 }),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              userRoleId: scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
            }
          ]
        },
        em
      );

      expect(support).toMatchObject({ id: support.id });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'userRole.id'])
        .innerJoin('support.userRoles', 'userRole')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.userRoles.map(u => u.id)).toContain(
        scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
      );

      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .leftJoinAndSelect('thread.followers', 'followers')
        .where('thread.contextId = :contextId', { contextId: support.id })
        .getOne();

      expect(dbThread?.followers.map(f => f.id)).toContain(
        scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
      );
    });

    it('should add the QA that made the request as assigned accessor when status is changed to WAITING', async () => {
      const support = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        innovation.supports.supportByHealthOrgUnit.id,
        {
          status: InnovationSupportStatusEnum.WAITING,
          message: randText({ charCount: 10 })
        },
        em
      );

      expect(support).toMatchObject({ id: support.id });

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'userRole.id'])
        .innerJoin('support.userRoles', 'userRole')
        .where('support.id = :supportId', { supportId: support.id })
        .getOne();

      expect(dbSupport?.userRoles.map(u => u.id)).toContain(scenario.users.aliceQualifyingAccessor.roles.qaRole.id);
      expect(dbSupport?.userRoles).toHaveLength(1);
    });

    it.each([
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED],
      [InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.UNSUITABLE],
      [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.CLOSED],
      [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.UNSUITABLE]
    ])(
      'should clear any open tasks when status is changed from %s to %s',
      async (previousStatus: InnovationSupportStatusEnum, newStatus: InnovationSupportStatusEnum) => {
        const scenarioSupport = innovation.supports.supportByHealthOrgUnit;

        if (previousStatus === InnovationSupportStatusEnum.WAITING) {
          await em.update(
            InnovationSupportEntity,
            { id: scenarioSupport.id },
            { status: InnovationSupportStatusEnum.WAITING }
          );
        }

        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          scenarioSupport.id,
          {
            status: newStatus,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbTasks = await em
          .createQueryBuilder(InnovationTaskEntity, 'task')
          .innerJoin('task.innovationSupport', 'support')
          .where('support.id = :supportId', { supportId: support.id })
          .andWhere('task.status IN (:...taskStatusActive)', {
            taskStatusActive: [InnovationTaskStatusEnum.OPEN]
          })
          .getCount();

        expect(dbTasks).toBe(0);
      }
    );

    it.each([InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE])(
      'should remove all assigned accessors when status is changed to %s',
      async (status: InnovationSupportStatusEnum) => {
        const support = await sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          {
            status: status,
            message: randText({ charCount: 10 })
          },
          em
        );

        expect(support).toMatchObject({
          id: support.id
        });

        const dbSupport = await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .select(['support.id', 'userRole.id'])
          .leftJoin('support.userRoles', 'userRole')
          .where('support.id = :supportId', { supportId: support.id })
          .getOne();

        expect(dbSupport?.userRoles).toHaveLength(0);
      }
    );

    it(`should throw a not found error if the support doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          randUuid(),
          {
            status: InnovationSupportStatusEnum.CLOSED,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it(`should throw a not found error if the thread creation fails`, async () => {
      const dbThread = await em
        .createQueryBuilder(InnovationThreadEntity, 'thread')
        .where('thread.id = :threadId', {
          threadId: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA.id
        })
        .getOne();

      jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread: dbThread!,
        message: undefined
      });

      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          {
            status: InnovationSupportStatusEnum.CLOSED,
            message: randText({ charCount: 10 })
          },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_MESSAGE_NOT_FOUND));
    });

    it(`should throw a UnprocessableEntityError when trying to update to UNASSIGNED`, async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          innovation.supports.supportByHealthOrgUnit.id,
          { status: InnovationSupportStatusEnum.UNASSIGNED, message: randText({ charCount: 10 }) },
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS)
      );
    });
  });

  describe('updateInnovationSupportAccessors', () => {
    const user = scenario.users.aliceQualifyingAccessor;
    const context = DTOsHelper.getUserRequestContext(user, 'qaRole');
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const support = innovation.supports.supportByHealthOrgUnit;
    const newAccessors = [
      {
        id: scenario.users.ingridAccessor.id,
        userRoleId: scenario.users.ingridAccessor.roles.accessorRole.id
      }
    ];

    it('should update to new accessors', async () => {
      await sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: newAccessors }, em);
      const supportRoles = (
        await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .leftJoinAndSelect('support.userRoles', 'userRoles')
          .where('support.id = :supportId', { supportId: support.id })
          .getOneOrFail()
      ).userRoles;

      expect(supportRoles).toHaveLength(1);
      expect(supportRoles[0]!.id).toBe(scenario.users.ingridAccessor.roles.accessorRole.id);
    });

    it('should add a message to the thread if one provided', async () => {
      await sut.updateInnovationSupportAccessors(
        context,
        innovation.id,
        support.id,
        { accessors: newAccessors, message: 'Test message' },
        em
      );

      expect(threadMessageMock).toHaveBeenCalledTimes(1);
      expect(threadMessageMock).toHaveBeenCalledWith(
        context,
        innovation.threads.threadByAliceQA.id,
        'Test message',
        false,
        false,
        em
      );
    });

    it("shouldn't add a message to the thread if one not provided", async () => {
      await sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: newAccessors }, em);

      expect(threadMessageMock).toHaveBeenCalledTimes(0);
    });

    it('should fail with not found if support not found', async () => {
      await expect(
        sut.updateInnovationSupportAccessors(context, innovation.id, randUuid(), { accessors: newAccessors }, em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('should fail with not found if thread not found', async () => {
      await em.update(InnovationThreadEntity, { contextId: support.id }, { deletedAt: new Date() });
      await expect(
        sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: newAccessors }, em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));
    });

    it('should fail with unprocessable if innovation status not engaging', async () => {
      await em.update(InnovationSupportEntity, { id: support.id }, { status: InnovationSupportStatusEnum.WAITING });
      await expect(
        sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: newAccessors }, em)
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UPDATE_WITH_UNPROCESSABLE_STATUS)
      );
    });

    it('should fail with unprocessable if accessors is empty', async () => {
      await expect(
        sut.updateInnovationSupportAccessors(context, innovation.id, support.id, { accessors: [] })
      ).rejects.toThrowError(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    });
  });

  describe('createProgressUpdate', () => {
    const innovationId = scenario.users.johnInnovator.innovations.johnInnovation.id;

    it('should create a support summary when a unit is engaging without a file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      const data = { title: randText(), description: randText() };
      const dbProgressId = randUuid();

      supportLogSpy.mockResolvedValue({ id: dbProgressId });

      await sut.createProgressUpdate(domainContext, innovationId, data, em);

      const fileExists = await em
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('file.contextId = :contextId', { contextId: dbProgressId })
        .andWhere('file.contextType = :contextType', {
          contextType: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
        })
        .andWhere('file.innovation = :innovationId', { innovationId })
        .getCount();

      expect(supportLogSpy).toHaveBeenCalledWith(
        em,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE,
          description: data.description,
          supportStatus: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.status,
          unitId: domainContext.organisation?.organisationUnit?.id,
          params: { title: data.title }
        }
      );
      expect(fileExists).toBe(0);
    });

    it('should create a support summary when a unit is engaging with a file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      const dbProgressId = randUuid();
      const data = {
        title: randText(),
        description: randText(),
        document: {
          name: randFileName(),
          file: {
            id: randUuid(),
            name: randFileName(),
            size: randNumber(),
            extension: randFileExt()
          }
        }
      };

      supportLogSpy.mockResolvedValue({ id: dbProgressId });

      await sut.createProgressUpdate(domainContext, innovationId, data, em);

      const fileExists = await em
        .createQueryBuilder(InnovationFileEntity, 'file')
        .where('file.contextId = :contextId', { contextId: dbProgressId })
        .andWhere('file.contextType = :contextType', {
          contextType: InnovationFileContextTypeEnum.INNOVATION_PROGRESS_UPDATE
        })
        .andWhere('file.innovation = :innovationId', { innovationId })
        .getCount();

      expect(supportLogSpy).toHaveBeenCalledWith(
        em,
        { id: domainContext.id, roleId: domainContext.currentRole.id },
        innovationId,
        {
          type: InnovationSupportLogTypeEnum.PROGRESS_UPDATE,
          description: data.description,
          supportStatus: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.status,
          unitId: domainContext.organisation?.organisationUnit?.id,
          params: { title: data.title }
        }
      );
      expect(fileExists).toBe(1);
    });

    it('should throw an NotFoundError when the unitId is not present in context', async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          innovationId,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it("should throw a NotFoundError when the support doesn't exist", async () => {
      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.samAccessor, 'accessorRole'),
          scenario.users.adamInnovator.innovations.adamInnovation.id,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });

    it('should throw an UnprocessableEntityError when the unit is not currently engaging', async () => {
      await em.update(
        InnovationSupportEntity,
        { id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id },
        { status: InnovationSupportStatusEnum.WAITING }
      );

      await expect(() =>
        sut.createProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          innovationId,
          { title: randText(), description: randText() },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_UNIT_NOT_ENGAGING));
    });
  });

  describe('deleteProgressUpdate', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const fileServiceDeleteSpy = jest.spyOn(InnovationFileService.prototype, 'deleteFile').mockResolvedValue();

    it('should delete a progress update without a file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');
      const progressUpdate = innovation.progressUpdates.progressUpdateByAlice;

      await sut.deleteProgressUpdate(domainContext, innovation.id, progressUpdate.id, em);

      const dbProgress = await em
        .createQueryBuilder(InnovationSupportLogEntity, 'log')
        .withDeleted()
        .where('log.id = :progressId', { progressId: progressUpdate.id })
        .getOneOrFail();

      expect(dbProgress).toMatchObject({
        deletedAt: expect.any(Date),
        updatedBy: domainContext.id
      });
      expect(fileServiceDeleteSpy).toBeCalledTimes(0);
    });

    it('should delete a progress update and the associated file', async () => {
      const domainContext = DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole');
      const progressUpdate = innovation.progressUpdates.progressUpdateByIngridWithFile;

      await sut.deleteProgressUpdate(domainContext, innovation.id, progressUpdate.id, em);

      const dbProgress = await em
        .createQueryBuilder(InnovationSupportLogEntity, 'log')
        .withDeleted()
        .where('log.id = :progressId', { progressId: progressUpdate.id })
        .getOneOrFail();

      expect(dbProgress).toMatchObject({
        deletedAt: expect.any(Date),
        updatedBy: domainContext.id
      });
      expect(fileServiceDeleteSpy).toBeCalledTimes(1);
    });

    it("should throw error NotFoundError if the progress update doesn't exist", async () => {
      await expect(() =>
        sut.deleteProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole'),
          innovation.id,
          randUuid(),
          em
        )
      ).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_UPDATE_NOT_FOUND)
      );
    });

    it('should throw error UnprocessableEntityError if the progress update was created by other unit', async () => {
      await expect(() =>
        sut.deleteProgressUpdate(
          DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole'),
          innovation.id,
          innovation.progressUpdates.progressUpdateByAlice.id,
          em
        )
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_SUMMARY_PROGRESS_DELETE_MUST_BE_FROM_UNIT)
      );
    });
  });

  describe('getValidSupportStatuses', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const supportThatWasEngaged = innovation.supports.supportByHealthOrgUnit;
    const supportThatWasNotEngaged = innovation.supports.supportByHealthOrgAiUnit;

    it.each([
      [
        InnovationSupportStatusEnum.UNASSIGNED,
        true,
        [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.ENGAGING
        ]
      ],
      [
        InnovationSupportStatusEnum.WAITING,
        true,
        [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.ENGAGING,
          InnovationSupportStatusEnum.CLOSED
        ]
      ],
      [
        InnovationSupportStatusEnum.WAITING,
        false,
        [InnovationSupportStatusEnum.UNSUITABLE, InnovationSupportStatusEnum.ENGAGING]
      ],
      [
        InnovationSupportStatusEnum.UNSUITABLE,
        true,
        [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.ENGAGING, InnovationSupportStatusEnum.CLOSED]
      ],
      [
        InnovationSupportStatusEnum.UNSUITABLE,
        false,
        [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.ENGAGING]
      ],
      [
        InnovationSupportStatusEnum.ENGAGING,
        true,
        [
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.CLOSED,
          InnovationSupportStatusEnum.UNSUITABLE
        ]
      ]
    ])(
      'when status is %s and wasEngaged=%s it should return %s',
      async (
        currentStatus: InnovationSupportStatusEnum,
        wasEngaged: boolean,
        expected: InnovationSupportStatusEnum[]
      ) => {
        const supportId = wasEngaged ? supportThatWasEngaged.id : supportThatWasNotEngaged.id;
        await em.getRepository(InnovationSupportEntity).update({ id: supportId }, { status: currentStatus });

        const validSupportStatuses = await sut.getValidSupportStatuses(
          innovation.id,
          supportId === supportThatWasEngaged.id
            ? scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            : scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
          em
        );

        expect(validSupportStatuses).toEqual(expect.arrayContaining(expected));
      }
    );

    it.each([
      [
        [
          InnovationSupportStatusEnum.UNSUITABLE,
          InnovationSupportStatusEnum.WAITING,
          InnovationSupportStatusEnum.ENGAGING
        ]
      ]
    ])("should return %s if support doesn't exist", async (expected: InnovationSupportStatusEnum[]) => {
      const validSupportStatuses = await sut.getValidSupportStatuses(innovation.id, randUuid(), em);
      expect(validSupportStatuses).toEqual(expect.arrayContaining(expected));
    });
  });
});
