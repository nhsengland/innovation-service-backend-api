import {
  InnovationEntity,
  InnovationExportRequestEntity,
  InnovationSupportEntity,
  InnovationTaskEntity,
  NotificationUserEntity
} from '@innovations/shared/entities';
import { ActivityEnum, ActivityTypeEnum, NotifierTypeEnum } from '@innovations/shared/enums';
import {
  InnovationExportRequestStatusEnum,
  InnovationSectionStatusEnum,
  InnovationStatusEnum,
  InnovationSupportLogTypeEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum
} from '@innovations/shared/enums/innovation.enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { TranslationHelper } from '@innovations/shared/helpers';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { ActivityLogBuilder, TestActivityLogType } from '@innovations/shared/tests/builders/activity-log.builder';
import { InnovationAssessmentBuilder } from '@innovations/shared/tests/builders/innovation-assessment.builder';
import { InnovationSectionBuilder } from '@innovations/shared/tests/builders/innovation-section.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import {
  randCompanyName,
  randCountry,
  randCountryCode,
  randDomainName,
  randPastDate,
  randText,
  randUuid
} from '@ngneat/falso';
import assert from 'node:assert';
import { EntityManager } from 'typeorm';
import { container } from '../_config';
import type { InnovationsService } from './innovations.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovations suite', () => {
  let sut: InnovationsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<InnovationsService>(SYMBOLS.InnovationsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    activityLogSpy.mockClear();
    supportLogSpy.mockClear();
    notifierSendSpy.mockClear();
  });

  describe.skip('getInnovationsList', () => {
    //TODO
    it('should list innovations', async () => {});
  });

  describe.skip('getInnovationInfo', () => {
    //TODO
    it('should get innovation info', async () => {});
  });

  describe('getNeedsAssessmentOverdueInnovations', () => {
    it.each([InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT as const, InnovationStatusEnum.NEEDS_ASSESSMENT as const])(
      'should get the number of innovations with overdue assessments in status %s',
      async (
        innovationStatus: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT | InnovationStatusEnum.NEEDS_ASSESSMENT
      ) => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
        const pastDate = randPastDate();
        pastDate.setDate(-30);

        //add an overdue assessment on johnInnovationEmpty
        await em
          .getRepository(InnovationEntity)
          .update({ id: innovation.id }, { submittedAt: pastDate, status: innovationStatus });
        await new InnovationAssessmentBuilder(em)
          .setInnovation(innovation.id)
          .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
          .save();

        const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
          DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
          { innovationStatus: [innovationStatus], assignedToMe: false },
          em
        );

        expect(countAssessments).toBe(1);
      }
    );

    it('should get the number of innovations with overdue assessments that are assigned to me', async () => {
      const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
      const adamInnovation = scenario.users.adamInnovator.innovations.adamInnovationEmpty;

      //add an overdue assessment on johnInnovationEmpty assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: johnInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(johnInnovation.id)
        .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
        .save();

      //add an overdue assessment on adamInnovationEmpty not assigned to paul
      await em
        .getRepository(InnovationEntity)
        .update(
          { id: adamInnovation.id },
          { submittedAt: randPastDate({ years: 2 }), status: InnovationStatusEnum.NEEDS_ASSESSMENT }
        );
      await new InnovationAssessmentBuilder(em)
        .setInnovation(adamInnovation.id)
        .setNeedsAssessor(scenario.users.seanNeedsAssessor.id)
        .save();

      const countAssessments = await sut.getNeedsAssessmentOverdueInnovations(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        { innovationStatus: [InnovationStatusEnum.NEEDS_ASSESSMENT], assignedToMe: true },
        em
      );

      expect(countAssessments).toBe(1);
    });
  });

  describe('createInnovation', () => {
    it('should create an innovation', async () => {
      const result = await sut.createInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          name: randCompanyName(),
          description: randText({ charCount: 10 }),
          countryName: randCountry(),
          postcode: randCountryCode(),
          website: randDomainName()
        },
        em
      );

      expect(result.id).toBeDefined();

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should throw an error if the name is not unique', async () => {
      await expect(() =>
        sut.createInnovation(
          DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
          {
            name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            description: randText({ charCount: 10 }),
            countryName: randCountry(),
            postcode: randCountryCode(),
            website: randDomainName()
          },
          em
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_ALREADY_EXISTS));
    });
  });

  describe('getInnovationShares', () => {
    it('should get the organisations the innovation is shared with', async () => {
      const result = await sut.getInnovationShares(scenario.users.johnInnovator.innovations.johnInnovation.id, em);

      expect(result).toMatchObject([
        {
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym
          }
        },
        {
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym
          }
        }
      ]);
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationShares(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('updateInnovationShares', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should update the organisations that the innovation is shared with', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .innerJoinAndSelect('innovation.organisationShares', 'organisationShares')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.organisationShares).toHaveLength(1);
      expect(dbInnovation?.organisationShares[0]?.id).toBe(scenario.organisations.innovTechOrg.id);

      expect(activityLogSpy).toHaveBeenCalled();
    });

    it('should set all open tasks from removed organisations to DECLINED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .where('task.innovation_support_id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .andWhere('task.status IN (:...taskStatus)', {
          taskStatus: [InnovationTaskStatusEnum.OPEN]
        })
        .getMany();

      expect(dbTasks).toHaveLength(0);
    });

    it('should set all ongoing supports from removed organisations to UNASSIGNED', async () => {
      // remove all existing shares and add share with innovTechOrg
      await sut.updateInnovationShares(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        [scenario.organisations.innovTechOrg.id],
        em
      );

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id IN (:...innovationSupportIds)', {
          innovationSupportIds: [
            innovation.supports.supportByHealthOrgAiUnit.id,
            innovation.supports.supportByHealthOrgUnit.id,
            innovation.supports.supportByMedTechOrgUnit.id
          ]
        })
        .withDeleted()
        .getMany();

      expect(dbSupports.map(s => s.status)).toMatchObject([
        InnovationSupportStatusEnum.UNASSIGNED,
        InnovationSupportStatusEnum.UNASSIGNED,
        InnovationSupportStatusEnum.UNASSIGNED
      ]);
    });

    it(`should throw an error if any of the provided organisations doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, [
          scenario.organisations.innovTechOrg.id,
          randUuid()
        ])
      ).rejects.toThrowError(new UnprocessableEntityError(OrganisationErrorsEnum.ORGANISATIONS_NOT_FOUND));
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.updateInnovationShares(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), [
          scenario.organisations.innovTechOrg.id
        ])
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('submitInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

    it('should submit the innovation for needs assessment', async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      await testsHelper.submitAllInnovationSections(innovation.id, em);

      const result = await sut.submitInnovation(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        em
      );

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.status).toBe(InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT);
      expect(result).toMatchObject({ id: innovation.id, status: InnovationStatusEnum.WAITING_NEEDS_ASSESSMENT });

      expect(activityLogSpy).toHaveBeenCalled();
      expect(notifierSendSpy).toHaveBeenCalled();
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), em)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_NO_SECTIONS));
    });

    it(`should throw an error if the innovation has no submitted sections`, async () => {
      //prepare innovation status
      await em.getRepository(InnovationEntity).update({ id: innovation.id }, { status: InnovationStatusEnum.CREATED });
      //add submitted section to innovation
      await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('INNOVATION_DESCRIPTION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      await expect(() =>
        sut.submitInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, em)
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SECTIONS_INCOMPLETE));
    });
  });

  describe('withdrawInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;
    const reason = randText({ charCount: 10 });

    it('should withdraw the innovation', async () => {
      // mock domain service withdraw innovation
      const domainServiceWithdrawSpy = jest.spyOn(DomainInnovationsService.prototype, 'withdrawInnovations');
      const mockedAffectedUsers = [
        // NA
        {
          userId: scenario.users.paulNeedsAssessor.id,
          userType: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
        },
        // collaborator
        {
          userId: scenario.users.janeInnovator.id,
          userType: scenario.users.janeInnovator.roles.innovatorRole.role
        },
        // QA
        {
          userId: scenario.users.aliceQualifyingAccessor.id,
          userType: scenario.users.aliceQualifyingAccessor.roles.qaRole.role,
          unitId: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        }
      ];

      domainServiceWithdrawSpy.mockResolvedValueOnce([
        {
          id: innovation.id,
          name: innovation.name,
          affectedUsers: mockedAffectedUsers
        }
      ]);

      const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);

      const result = await sut.withdrawInnovation(context, innovation.id, reason, em);

      expect(result).toMatchObject({ id: innovation.id });

      expect(domainServiceWithdrawSpy).toHaveBeenCalledWith(
        { id: context.id, roleId: context.currentRole.id },
        [{ id: innovation.id, reason }],
        expect.any(EntityManager) // transaction
      );

      expect(notifierSendSpy).toHaveBeenCalledWith(context, NotifierTypeEnum.INNOVATION_WITHDRAWN, {
        innovation: {
          id: innovation.id,
          name: innovation.name,
          affectedUsers: mockedAffectedUsers
        }
      });
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() =>
        sut.withdrawInnovation(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), randUuid(), reason)
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND));
    });
  });

  describe('archiveInnovation', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const context = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator);
    const message = randText({ charCount: 10 });

    it('should archive the innovation', async () => {
      await sut.archiveInnovation(context, innovation.id, { message: message }, em);

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select(['innovation.status', 'innovation.archivedStatus'])
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getOne();

      expect(dbInnovation?.status).toBe(InnovationStatusEnum.ARCHIVED);
      expect(dbInnovation?.archivedStatus).toBe(innovation.status);
    });

    it('should cancel all open tasks', async () => {
      const dbPreviouslyOpenTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .select(['task.status', 'task.id'])
        .innerJoin('task.innovationSection', 'innovationSection')
        .innerJoin('innovationSection.innovation', 'innovation')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .andWhere('task.status IN (:...openTaskStatuses)', {
          openTaskStatuses: [InnovationTaskStatusEnum.OPEN]
        })
        .getMany();

      await sut.archiveInnovation(context, innovation.id, { message: message }, em);

      const dbCancelledTasks = await em
        .createQueryBuilder(InnovationTaskEntity, 'task')
        .select(['task.status'])
        .where('task.id IN (:...taskIds)', { taskIds: dbPreviouslyOpenTasks.map(a => a.id) })
        .getMany();

      expect(dbCancelledTasks).toHaveLength(dbPreviouslyOpenTasks.length);
    });

    it('should close all support and save a snapshot', async () => {
      const dbPreviousSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'support.status', 'support.archiveSnapshot', 'userRole.id', 'user.id'])
        .innerJoin('support.innovation', 'innovation')
        .leftJoin('support.userRoles', 'userRole')
        .leftJoin('userRole.user', 'user')
        .where('innovation.id = :innovationId', { innovationId: innovation.id })
        .getMany();

      await sut.archiveInnovation(context, innovation.id, { message: message }, em);

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .select(['support.id', 'support.status', 'support.archiveSnapshot'])
        .where('support.id IN (:...supportIds)', { supportIds: dbPreviousSupports.map(s => s.id) })
        .getMany();

      for (const support of dbSupports) {
        const previousSupport = dbPreviousSupports.find(s => s.id === support.id);
        assert(previousSupport);
        expect(support.status).toBe(InnovationSupportStatusEnum.CLOSED);
        expect(support.archiveSnapshot).toMatchObject({
          archivedAt: expect.any(String),
          status: previousSupport.status,
          assignedAccessors: previousSupport.userRoles.map(r => r.user.id)
        });
      }
    });

    it('should reject all pending export requests', async () => {
      // ensure request is pending
      await em
        .getRepository(InnovationExportRequestEntity)
        .update(
          { id: innovation.exportRequests.requestByAlice.id },
          { status: InnovationExportRequestStatusEnum.PENDING }
        );

      await sut.archiveInnovation(context, innovation.id, { message: message }, em);

      const dbRequest = await em
        .createQueryBuilder(InnovationExportRequestEntity, 'request')
        .select(['request.status', 'request.rejectReason'])
        .where('request.id = :requestId', { requestId: innovation.exportRequests.requestByAlice.id })
        .getOne();

      expect(dbRequest?.status).toBe(InnovationExportRequestStatusEnum.REJECTED);
      expect(dbRequest?.rejectReason).toBe(TranslationHelper.translate('DEFAULT_MESSAGES.EXPORT_REQUEST.ARCHIVE'));
    });

    it('should add the archive to support summary', async () => {
      const nPreviousSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('innovation_id = :innovationId', { innovationId: innovation.id })
        .getCount();

      await sut.archiveInnovation(context, innovation.id, { message: message }, em);

      expect(supportLogSpy).toHaveBeenCalledTimes(nPreviousSupports);
      expect(supportLogSpy).toHaveBeenLastCalledWith(
        expect.any(EntityManager),
        { id: context.id, roleId: context.currentRole.id },
        innovation.id,
        {
          type: InnovationSupportLogTypeEnum.INNOVATION_ARCHIVED,
          description: message,
          unitId: expect.any(String)
        }
      );
    });
  });

  describe('getInnovationActivitiesLog', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    let activityLogOld: TestActivityLogType;
    let activityLogNew: TestActivityLogType;

    beforeEach(async () => {
      activityLogOld = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.TASKS)
        .setActivity(ActivityEnum.TASK_CREATION)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2015'))
        .setCreatedBy(scenario.users.aliceQualifyingAccessor)
        .setInterveningUser(scenario.users.aliceQualifyingAccessor)
        .save();

      activityLogNew = await new ActivityLogBuilder(em)
        .setType(ActivityTypeEnum.NEEDS_ASSESSMENT)
        .setActivity(ActivityEnum.NEEDS_ASSESSMENT_COMPLETED)
        .setInnovation(innovation.id)
        .setCreatedAt(new Date('10/10/2022'))
        .setCreatedBy(scenario.users.paulNeedsAssessor)
        .setInterveningUser(scenario.users.paulNeedsAssessor)
        .save();
    });

    it('should return the activity log data of the innovation', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          },
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation ordered by ascending creation date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {},
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'ASC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          },
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation for the given activity type', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          activityTypes: [ActivityTypeEnum.TASKS]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given start date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          dateFilters: [{ field: 'createdAt', startDate: new Date('10/10/2020') }]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogNew.type,
            activity: activityLogNew.activity,
            date: new Date(activityLogNew.createdAt),
            params: activityLogNew.param
          }
        ]
      });
    });

    it('should return the activity log data of the innovation according to the given end date', async () => {
      const result = await sut.getInnovationActivitiesLog(
        innovation.id,
        {
          dateFilters: [{ field: 'createdAt', endDate: new Date('10/10/2020') }]
        },
        {
          skip: 0,
          take: 10,
          order: { createdAt: 'DESC' }
        },
        em
      );

      expect(result).toMatchObject({
        count: 1,
        data: [
          {
            type: activityLogOld.type,
            activity: activityLogOld.activity,
            date: new Date(activityLogOld.createdAt),
            params: activityLogOld.param
          }
        ]
      });
    });
  });

  describe('dismissNotifications', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should dismiss all unread notifications', async () => {
      await sut.dismissNotifications(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        innovation.id,
        {
          notificationIds: [],
          contextTypes: [],
          contextDetails: [],
          contextIds: []
        },
        em
      );

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.innovation_id = :innovationId', { innovationId: innovation.id })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });

    it('should dismiss all unread notifications with given notificationIds', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [innovation.notifications.notificationFromSupport.id],
        contextTypes: [],
        contextDetails: [],
        contextIds: []
      });

      const dbNotification = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.id = :notificationId', {
          notificationId: innovation.notifications.notificationFromSupport.id
        })
        .getOne();

      expect(dbNotification?.readAt).not.toBeNull();
    });

    it('should dismiss all unread notifications with given notification context types', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [innovation.notifications.notificationFromSupport.context.type],
        contextDetails: [],
        contextIds: []
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextType = :notificationContextType', {
          notificationContextType: innovation.notifications.notificationFromSupport.context.type
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });

    it('should dismiss all unread notifications with given notification context details', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [],
        contextDetails: [innovation.notifications.notificationFromSupport.context.detail],
        contextIds: []
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextDetail = :notificationContextDetail', {
          notificationContextDetail: innovation.notifications.notificationFromSupport.context.detail
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });

    it('should dismiss all unread notifications with given notification contextIds', async () => {
      await sut.dismissNotifications(DTOsHelper.getUserRequestContext(scenario.users.johnInnovator), innovation.id, {
        notificationIds: [],
        contextTypes: [],
        contextDetails: [],
        contextIds: [innovation.notifications.notificationFromSupport.context.id]
      });

      const dbNotifications = await em
        .createQueryBuilder(NotificationUserEntity, 'notificationUser')
        .innerJoin('notificationUser.notification', 'notification')
        .where('notification.contextId = :notificationContextId', {
          notificationContextId: innovation.notifications.notificationFromSupport.context.id
        })
        .getMany();

      expect(dbNotifications.filter(n => n.readAt === null)).toHaveLength(0);
    });
  });

  describe('getInnovationSubmissionsState', () => {
    it('should get the innovation submission state', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const result = await sut.getInnovationSubmissionsState(innovation.id, em);

      expect(result).toMatchObject({
        submittedAllSections: false,
        submittedForNeedsAssessment: true
      });
    });

    it(`should throw an error if the innovation doesn't exist`, async () => {
      await expect(() => sut.getInnovationSubmissionsState(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });
});
