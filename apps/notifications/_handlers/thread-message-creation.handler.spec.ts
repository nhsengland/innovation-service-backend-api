/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ThreadMessageCreationHandler } from './thread-message-creation.handler';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';

describe('Notifications / _handlers / thread-message-creation suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  beforeEach(async () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const owner = scenario.users.johnInnovator;
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: owner.id,
      ownerIdentityId: owner.identityId
    });
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
  });


  describe('Message not sent by innovation owner or collaborator', () => {
    it('Should always email the innovation owner', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByAliceQA;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
        ]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.aliceMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
          notificationPreferenceType: 'MESSAGE',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            innovation_name: innovation.name,
            subject: thread.subject,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                innovationId: innovation.id,
                threadId: thread.id
              })
              .buildUrl()
          }
        }
      ]);
    });
    it('Should always send inApp notification to innovation owner and collaborators', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByAliceQA;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
        ]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.aliceMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.inApp).toHaveLength(1);
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
            id: thread.id
          },
          userRoleIds: [
            scenario.users.johnInnovator.roles.innovatorRole.id,
            scenario.users.janeInnovator.roles.innovatorRole.id
          ],
          params: { subject: thread.subject, messageId: thread.messages.aliceMessage.id }
        }
      ]);
    });
  });

  describe('New message by innovation owner', () => {
    it('Should email all thread intervenients and not email the innovation owner', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByJohn;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.johnInnovator)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)
        ]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.johnMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
          notificationPreferenceType: 'MESSAGE',
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            innovation_name: innovation.name,
            subject: thread.subject,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('accessor/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                innovationId: innovation.id,
                threadId: thread.id
              })
              .buildUrl()
          }
        }
      ]);
    });
  });

  describe('New message by innovation collaborator', () => {
    it('Should not send inApp to the collaborator who sent the message', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByJaneCollaborator;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.janeInnovator, 'innovatorRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
        ]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.janeMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.inApp).toHaveLength(1);
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
            id: thread.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          params: { subject: thread.subject, messageId: thread.messages.janeMessage.id }
        }
      ]);
    });
  });

  describe('New message in thread owned by NA', () => {
    it('Should send email to the thread owner', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByPaulNA;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor),
        ]);

      // mock innovation collaborators
      jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce([]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.johnMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
          notificationPreferenceType: 'MESSAGE',
          to: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            innovation_name: innovation.name,
            subject: thread.subject,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('assessment/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                innovationId: innovation.id,
                threadId: thread.id
              })
              .buildUrl()
          }
        }
      ]);
    });
    it('Should send inApp to the thread owner', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByPaulNA;
      const requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
      });
      // mock thread follwers 
      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor),
        ]);

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.johnMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.inApp).toHaveLength(1);
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_MESSAGE_CREATION,
            id: thread.id
          },
          userRoleIds: [scenario.users.paulNeedsAssessor.roles.assessmentRole.id],
          params: { subject: thread.subject, messageId: thread.messages.johnMessage.id }
        }
      ]);
    });
  });
});
