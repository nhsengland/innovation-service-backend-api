import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import {
  InnovationExportRequestStatusEnum,
  InnovationSectionStatusEnum,
  InnovationTaskStatusEnum,
  NotificationContextDetailEnum
} from '@innovations/shared/enums';
import { BadRequestError, GenericErrorsEnum, NotFoundError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationAssessmentBuilder } from '@innovations/shared/tests/builders/innovation-assessment.builder';
import { InnovationSectionBuilder } from '@innovations/shared/tests/builders/innovation-section.builder';
import { NotificationBuilder } from '@innovations/shared/tests/builders/notification.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';

import { container } from '../_config';
import type { StatisticsService } from './statistics.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation statistics suite', () => {
  let sut: StatisticsService;

  let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    sut = container.get<StatisticsService>(SYMBOLS.StatisticsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getTasks', () => {
    it('should get tasks for the given innovation and status', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const tasks = await sut.getTasks(innovation.id, [InnovationTaskStatusEnum.OPEN], em);

      expect(tasks).toMatchObject([
        {
          updatedAt: new Date(innovation.tasks.taskByBart.updatedAt),
          section: innovation.tasks.taskByBart.section
        },
        {
          updatedAt: new Date(innovation.tasks.taskByPaul.updatedAt),
          section: innovation.tasks.taskByPaul.section
        },
        {
          updatedAt: new Date(innovation.tasks.taskByAliceOpen.updatedAt),
          section: innovation.tasks.taskByAliceOpen.section
        }
      ]);
    });
  });

  describe('getTasksCounter', () => {
    it.each([
      [
        'QA',
        [InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.CANCELLED],
        scenario.users.aliceQualifyingAccessor, // has two tasks one open and one done
        { OPEN: 1, DONE: 1, CANCELLED: 0 }
      ],
      [
        'NA',
        [InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.DONE],
        scenario.users.seanNeedsAssessor, // has 0 task and paulNA has 1
        { OPEN: 1, DONE: 0 }
      ]
    ])(
      'as %s should get my organisation tasks counter for the given innovation and $s',
      async (_label, statuses, user, res) => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        const tasksCounter = await sut.getTasksCounter(DTOsHelper.getUserRequestContext(user), innovation.id, statuses);

        expect(tasksCounter).toEqual({ ...res, lastUpdatedAt: expect.any(Date) });
      }
    );

    it("shouldn't return status that wasn't requested", async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const tasksCounter = await sut.getTasksCounter(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        [InnovationTaskStatusEnum.OPEN] // alice also has a done task
      );

      expect((tasksCounter as any)[InnovationTaskStatusEnum.CANCELLED]).toBeUndefined();
      expect((tasksCounter as any)[InnovationTaskStatusEnum.DONE]).toBeUndefined();
      expect((tasksCounter as any)[InnovationTaskStatusEnum.DECLINED]).toBeUndefined();
    });

    it('should throw bad request if status missing', async () => {
      await expect(() =>
        sut.getTasksCounter(DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor), randUuid(), [])
      ).rejects.toThrowError(new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD));
    });
  });

  describe('getLastUpdatedTask', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const taskStatus = [
      InnovationTaskStatusEnum.OPEN,
      InnovationTaskStatusEnum.DONE,
      InnovationTaskStatusEnum.CANCELLED
    ];

    it('should return the last updated task from my unit', async () => {
      const task = innovation.tasks.taskByAliceOpen;

      const lastUpdatedByTask = await sut.getLastUpdatedTask(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        taskStatus,
        { myTeam: true },
        em
      );

      expect(lastUpdatedByTask).toEqual({ id: task.id, updatedAt: expect.any(Date), section: task.section });
    });

    it('should return the last updated task from my team', async () => {
      const task = innovation.tasks.taskByPaul;

      const lastUpdatedByTask = await sut.getLastUpdatedTask(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        taskStatus,
        { myTeam: true },
        em
      );

      expect(lastUpdatedByTask).toEqual({ id: task.id, updatedAt: expect.any(Date), section: task.section });
    });

    it('should return the last updated task by me', async () => {
      const task = innovation.tasks.taskByPaul;

      const lastUpdatedByTask = await sut.getLastUpdatedTask(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        innovation.id,
        taskStatus,
        { mine: true },
        em
      );

      expect(lastUpdatedByTask).toEqual({ id: task.id, updatedAt: expect.any(Date), section: task.section });
    });

    it('should return null if no task is found', async () => {
      const lastUpdatedByTask = await sut.getLastUpdatedTask(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        randUuid(),
        taskStatus,
        { mine: true },
        em
      );
      expect(lastUpdatedByTask).toBeNull();
    });
  });

  describe('getSubmittedSections', () => {
    it('should get submitted sections for the given innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const sections = await sut.getSubmittedSections(innovation.id, em);

      expect(sections).toMatchObject([
        {
          updatedAt: new Date(innovation.sections.INNOVATION_DESCRIPTION.updatedAt),
          section: innovation.sections.INNOVATION_DESCRIPTION.section
        },
        {
          updatedAt: new Date(innovation.sections.EVIDENCE_OF_EFFECTIVENESS.updatedAt),
          section: innovation.sections.EVIDENCE_OF_EFFECTIVENESS.section
        }
      ]);
    });
  });

  describe('getSubmittedSectionsSinceSupportStart', () => {
    it('should get submitted sections for given innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      //submit new section on jonhInnovation
      const section = await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('COST_OF_INNOVATION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      const sections = await sut.getSubmittedSectionsSinceSupportStart(
        innovation.id,
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(sections).toMatchObject([
        {
          section: section.section,
          updatedAt: new Date(section.updatedAt)
        }
      ]);
    });

    it('should throw a not found error when the domain context has no organisation unit', async () => {
      await expect(() =>
        sut.getSubmittedSectionsSinceSupportStart(
          scenario.users.johnInnovator.innovations.johnInnovation.id,
          DTOsHelper.getUserRequestContext(scenario.users.allMighty)
        )
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });
  });

  describe('getSubmittedSectionsSinceAssessmentStart', () => {
    it('should get submitted sections for given innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

      //submit section before assessment start
      await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('INNOVATION_DESCRIPTION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      //start assessment
      await new InnovationAssessmentBuilder(em)
        .setInnovation(innovation.id)
        .setNeedsAssessor(scenario.users.paulNeedsAssessor.id)
        .save();

      //submit section
      const section = await new InnovationSectionBuilder(em)
        .setInnovation(innovation.id)
        .setSection('COST_OF_INNOVATION')
        .setStatus(InnovationSectionStatusEnum.SUBMITTED)
        .save();

      const sections = await sut.getSubmittedSectionsSinceAssessmentStart(
        innovation.id,
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        em
      );

      expect(sections).toMatchObject([
        {
          section: section.section,
          updatedAt: new Date(section.updatedAt)
        }
      ]);
    });
  });

  describe('getUnreadMessages', () => {
    it('should get unread messages for the given innovation and roleId', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovationEmpty;

      //create unread message notification
      const notification = await new NotificationBuilder(em)
        .setInnovation(innovation.id)
        .setContext('MESSAGES', NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, randUuid())
        .addNotificationUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
        .save();

      const unreadMessages = await sut.getUnreadMessages(
        innovation.id,
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

      expect(unreadMessages).toMatchObject({
        count: 1,
        lastSubmittedAt: new Date(notification.createdAt)
      });
    });
  });

  describe('getUnreadMessagesInitiatedBy', () => {
    it('should get unread messages for the given innovation and initiated by the given roleId', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByAliceQA;

      //create unread message notification
      await new NotificationBuilder(em)
        .setInnovation(innovation.id)
        .setContext('MESSAGES', NotificationContextDetailEnum.THREAD_MESSAGE_CREATION, thread.id)
        .addNotificationUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
        .save();

      const unreadMessages = await sut.getUnreadMessagesInitiatedBy(
        innovation.id,
        scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
        em
      );

      expect(unreadMessages).toMatchObject({
        count: 1,
        lastSubmittedAt: new Date(thread.messages.aliceMessage.createdAt)
      });
    });
  });

  describe('getPendingExportRequests', () => {
    it('should get pending request for the given innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const nPendingRequests = await sut.getPendingExportRequests(innovation.id, em);

      expect(nPendingRequests).toBe(
        Object.values(innovation.exportRequests).filter(r => r.status === InnovationExportRequestStatusEnum.PENDING)
          .length
      );
    });
  });
});
