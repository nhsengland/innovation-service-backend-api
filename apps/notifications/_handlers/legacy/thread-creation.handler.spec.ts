/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NotificationCategoryEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import type {
  TestInnovationThreadMessageType,
  TestInnovationThreadType
} from '@notifications/shared/tests/builders/innovation-thread.builder';
import type { TestUserType } from '@notifications/shared/tests/builders/user.builder';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { ThreadCreationHandler } from './thread-creation.handler';

type ThreadCreationHandlerData = {
  roleKey: string;
  requestUser: TestUserType;
  thread: TestInnovationThreadType;
  message: TestInnovationThreadMessageType;
  unitName?: string;
  inAppRecipients?: string[];
  emailRecipient?: TestUserType;
};

describe('Notifications / _handlers / thread-creation suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe('New thread by assigned user (QA/A/NA)', () => {
    const getAliceData = (): ThreadCreationHandlerData => {
      return {
        roleKey: 'qaRole',
        requestUser: scenario.users.aliceQualifyingAccessor,
        thread: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA,
        message: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA.messages.aliceMessage,
        unitName: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
      };
    };
    const getIngridData = (): ThreadCreationHandlerData => {
      return {
        roleKey: 'accessorRole',
        requestUser: scenario.users.ingridAccessor,
        thread: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByIngridAccessor,
        message:
          scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByIngridAccessor.messages.ingridMessage,
        unitName: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
      };
    };
    const getPaulData = (): ThreadCreationHandlerData => {
      return {
        roleKey: 'assessmentRole',
        requestUser: scenario.users.paulNeedsAssessor,
        thread: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByPaulNA,
        message: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByPaulNA.messages.paulMessage,
        unitName: 'needs assessment'
      };
    };
    beforeAll(async () => {
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);
    });
    it.each([
      ['QA', getAliceData],
      ['Accessor', getIngridData],
      ['NA', getPaulData]
    ])('Thread created by %s', async (_, getFunc: () => ThreadCreationHandlerData) => {
      const { roleKey, requestUser, thread, message, unitName } = getFunc();
      const requestContext = DTOsHelper.getUserRequestContext(requestUser, roleKey);
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      // to be removed
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce({
        displayName: requestUser.name
      } as any);

      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: scenario.users.johnInnovator.innovations.johnInnovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });

      const handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: message.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(2);
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
          notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          params: {
            accessor_name: requestUser.name, //Review what should happen if user is not found
            unit_name: unitName,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                innovationId: innovation.id,
                threadId: thread.id
              })
              .buildUrl()
          }
        },
        {
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
          notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
          params: {
            accessor_name: requestUser.name, //Review what should happen if user is not found
            unit_name: unitName,
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
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_CREATION,
            id: thread.id
          },
          userRoleIds: [
            scenario.users.johnInnovator.roles.innovatorRole.id,
            scenario.users.janeInnovator.roles.innovatorRole.id
          ],
          params: {
            subject: thread.subject,
            messageId: message.id
          }
        }
      ]);
    });
  });

  describe('New thread by innovator', () => {
    beforeEach(async () => {
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      jest
        .spyOn(RecipientsService.prototype, 'threadFollowerRecipients')
        .mockResolvedValueOnce([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
        ]);

      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        name: scenario.users.johnInnovator.innovations.johnInnovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
    });

    const getJohnData = (): ThreadCreationHandlerData => {
      return {
        roleKey: 'innovatorRole',
        requestUser: scenario.users.johnInnovator,
        thread: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByJohn,
        message: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByJohn.messages.johnMessage,
        inAppRecipients: [scenario.users.janeInnovator.roles.innovatorRole.id],
        emailRecipient: scenario.users.janeInnovator
      };
    };
    const getJaneData = (): ThreadCreationHandlerData => {
      return {
        roleKey: 'innovatorRole',
        requestUser: scenario.users.janeInnovator,
        thread: scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByJaneCollaborator,
        message:
          scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByJaneCollaborator.messages.janeMessage,
        inAppRecipients: [scenario.users.johnInnovator.roles.innovatorRole.id],
        emailRecipient: scenario.users.johnInnovator
      };
    };

    it.each([
      ['owner', getJohnData],
      ['collaborator', getJaneData]
    ])('Thread created by innovation %s', async (_, getFunc) => {
      const { roleKey, requestUser, thread, message, inAppRecipients, emailRecipient } = getFunc();
      const requestContext = DTOsHelper.getUserRequestContext(requestUser, roleKey);

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      // to be removed
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce({
        displayName: requestUser.name
      } as any);

      const handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: message.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(2);
      expect(handler.emails).toMatchObject([
        {
          templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR,
          notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
          to: DTOsHelper.getRecipientUser(emailRecipient!, 'innovatorRole'),
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            subject: thread.subject,
            innovation_name: innovation.name,
            thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/threads/:threadId')
              .setPathParams({
                innovationId: innovation.id,
                threadId: thread.id
              })
              .buildUrl()
          }
        },
        {
          templateId: EmailTypeEnum.THREAD_CREATION_TO_ASSIGNED_USERS,
          notificationPreferenceType: NotificationCategoryEnum.MESSAGE,
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          params: {
            // display_name: '', // This will be filled by the email-listener function.
            innovation_name: innovation.name,
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
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_CREATION,
            id: thread.id
          },
          userRoleIds: inAppRecipients,
          params: {
            subject: thread.subject,
            messageId: message.id
          }
        },
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.THREAD,
            detail: NotificationContextDetailEnum.THREAD_CREATION,
            id: thread.id
          },
          userRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
          params: {
            subject: thread.subject,
            messageId: message.id
          }
        }
      ]);
    });
  });
});
