/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { ThreadMessageCreationHandler } from './thread-message-creation.handler';

describe('Notifications / _handlers / thread-message-creation suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const owner = scenario.users.johnInnovator;
  const thread = innovation.threads.threadByPaulNA;

  jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
    name: innovation.name,
    ownerId: owner.id,
    ownerIdentityId: owner.identityId
  });

  jest
    .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
    .mockResolvedValue([
      DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
      DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
      DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
    ]);

  describe('Message not sent by innovation owner or collaborator', () => {
    const requestUser = DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole');

    it.each([
      ['the innovation owner', DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'), 'innovator'],
      [
        'the innovation collaborators',
        DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
        'innovator'
      ],
      [
        'all followers except the request user',
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        'accessor'
      ]
    ])('Should always email %s', async (_s, userRecipient, basePath) => {
      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
      });

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.paulMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toContainEqual({
        templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
        notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
        to: userRecipient,
        params: {
          innovation_name: innovation.name,
          subject: thread.subject,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':basePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              basePath,
              innovationId: innovation.id,
              threadId: thread.id
            })
            .buildUrl()
        }
      });
    });
    it('Should always send inApp notification to innovation owner, collaborators and followers', async () => {
      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)
      });

      const handler = new ThreadMessageCreationHandler(
        requestUser,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.paulMessage.id
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
            scenario.users.janeInnovator.roles.innovatorRole.id,
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id
          ],
          params: { subject: thread.subject, messageId: thread.messages.paulMessage.id }
        }
      ]);
    });
  });

  describe('New message by innovation owner', () => {
    const requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

    it.each([
      [
        'all thread followers (except NA)',
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        'accessor'
      ],
      ['the collaborators', DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'), 'innovator']
    ])('Should send email to %s', async (_s, userRecipient, basePath) => {
      // mock thread info
      jest.spyOn(RecipientsService.prototype, 'threadInfo').mockResolvedValueOnce({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.johnInnovator)
      });

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

      expect(handler.emails).toContainEqual({
        templateId: EmailTypeEnum.THREAD_MESSAGE_CREATION_TO_ALL,
        notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
        to: userRecipient,
        params: {
          innovation_name: innovation.name,
          subject: thread.subject,
          thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':basePath/innovations/:innovationId/threads/:threadId')
            .setPathParams({
              basePath,
              innovationId: innovation.id,
              threadId: thread.id
            })
            .buildUrl()
        }
      });

      if (userRecipient.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
        expect(handler.emails).toHaveLength(2); //follower QA and jane collaborator (NA should not receive)
      }
    });
  });
});
