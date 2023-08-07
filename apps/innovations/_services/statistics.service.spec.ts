import { randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';

import {
  InnovationActionStatusEnum,
  InnovationSectionStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@innovations/shared/enums';
import { NotFoundError, OrganisationErrorsEnum } from '@innovations/shared/errors';
import { TestsHelper } from '@innovations/shared/tests';
import { InnovationAssessmentBuilder } from '@innovations/shared/tests/builders/innovation-assessment.builder';
import { InnovationSectionBuilder } from '@innovations/shared/tests/builders/innovation-section.builder';
import { NotificationBuilder } from '@innovations/shared/tests/builders/notification.builder';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';

import { container } from '../_config';
import type { StatisticsService } from './statistics.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / innovation transfer suite', () => {
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

  describe('getActions', () => {
    it('should get actions for the given innovation and status', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const actions = await sut.getActions(innovation.id, [InnovationActionStatusEnum.REQUESTED], em);

      expect(actions).toMatchObject([
        {
          updatedAt: new Date(innovation.actions.actionByBart.updatedAt),
          section: innovation.actions.actionByBart.section
        },
        {
          updatedAt: new Date(innovation.actions.actionByPaul.updatedAt),
          section: innovation.actions.actionByPaul.section
        },
        {
          updatedAt: new Date(innovation.actions.actionByAlice.updatedAt),
          section: innovation.actions.actionByAlice.section
        }
      ]);
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

  describe('actionsToReview', () => {
    it('should get actions to review for given innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const action = innovation.actions.actionByAliceSubmitted;

      const actions = await sut.actionsToReview(
        innovation.id,
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        em
      );

      expect(actions).toMatchObject({
        count: 1,
        lastSubmittedSection: innovation.sections.INNOVATION_DESCRIPTION.section,
        lastSubmittedAt: new Date(action.updatedAt)
      });
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
        .setContext(
          NotificationContextTypeEnum.THREAD,
          NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          randUuid()
        )
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
        .setContext(
          NotificationContextTypeEnum.THREAD,
          NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
          thread.id
        )
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

      expect(nPendingRequests).toBe(Object.keys(innovation.exportRequests).length);
    });
  });
});
