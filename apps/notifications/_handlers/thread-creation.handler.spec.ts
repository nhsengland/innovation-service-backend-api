/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ThreadCreationHandler } from './thread-creation.handler';
import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';

describe('Notifications / _handlers / thread-creation suite', () => {
  let handler: ThreadCreationHandler;
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('New thread by assigned user (QA/A/NA)', () => {
    beforeAll(() => {
      // these function calls are not relevant to the handler test as the recipients are overwritten by the getUsersRecipient mock
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({} as any);
      jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValue([]);
    });

    it('Should send an email to innovation owner and collaborators when a QA creates a thread', async () => {
      const requestContext = testsHelper.getUserContext(scenario.users.aliceQualifyingAccessor, 'qaRole');

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByAliceQA;

      //only need the display name
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValue({
        displayName: scenario.users.aliceQualifyingAccessor.name
      } as any);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.aliceMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(2);
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
            params: {
              accessor_name: scenario.users.aliceQualifyingAccessor.name, //Review what should happen if user is not found
              unit_name:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
            params: {
              accessor_name: scenario.users.aliceQualifyingAccessor.name, //Review what should happen if user is not found
              unit_name:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );

      expect(handler.inApp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
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
              messageId: thread.messages.aliceMessage.id
            }
          })
        ])
      );
    });

    it('Should send an email to innovation owner and collaborators when an Accessor creates a thread', async () => {
      const requestContext = testsHelper.getUserContext(scenario.users.ingridAccessor, 'accessorRole');

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByIngridAccessor;

      //only need the display name
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValue({
        displayName: scenario.users.ingridAccessor.name
      } as any);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.ingridMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(2);
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
            params: {
              accessor_name: scenario.users.ingridAccessor.name, //Review what should happen if user is not found
              unit_name: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
            params: {
              accessor_name: scenario.users.ingridAccessor.name,
              unit_name: scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );

      expect(handler.inApp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
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
              messageId: thread.messages.ingridMessage.id
            }
          })
        ])
      );
    });

    it('Should send an email to innovation owner and collaborators when an NA creates a thread', async () => {
      const requestContext = testsHelper.getUserContext(scenario.users.paulNeedsAssessor, 'assessmentRole');

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByPaulNA

      //only need the display name
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValue({
        displayName: scenario.users.paulNeedsAssessor.name
      } as any);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.paulMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(2);
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
            params: {
              accessor_name: scenario.users.paulNeedsAssessor.name, //Review what should happen if user is not found
              unit_name: 'needs assessment',
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_ASSIGNED_USER,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
            params: {
              accessor_name: scenario.users.paulNeedsAssessor.name, //Review what should happen if user is not found
              unit_name: 'needs assessment',
              thread_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('innovator/innovations/:innovationId/threads/:threadId')
                .setPathParams({
                  innovationId: innovation.id,
                  threadId: thread.id
                })
                .buildUrl()
            }
          })
        ])
      );

      expect(handler.inApp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            innovationId: innovation.id,
            context: {
              type: NotificationContextTypeEnum.THREAD,
              detail: NotificationContextDetailEnum.THREAD_CREATION,
              id: innovation.threads.threadByPaulNA.id
            },
            userRoleIds: [
              scenario.users.johnInnovator.roles.innovatorRole.id,
              scenario.users.janeInnovator.roles.innovatorRole.id
            ],
            params: {
              subject: innovation.threads.threadByPaulNA.subject,
              messageId: innovation.threads.threadByPaulNA.messages.paulMessage.id
            }
          })
        ])
      );
    });
  });

  describe('New thread by innovator (owner or collaborator)', () => {
    beforeAll(() => {
      // these function calls are not relevant to the handler test as the recipients are overwritten by the getUsersRecipient mock
      jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValue([]);
    });

    it('Should send inApp and email to innvovation owner when a collaborator creates a thread', async () => {
      const requestContext = testsHelper.getUserContext(scenario.users.janeInnovator, 'innovatorRole');

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByJaneCollaborator;

      //only need the display name
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValue({
        displayName: scenario.users.janeInnovator.name
      } as any);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.janeMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
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
          })
        ])
      );
      expect(handler.inApp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            innovationId: innovation.id,
            context: {
              type: NotificationContextTypeEnum.THREAD,
              detail: NotificationContextDetailEnum.THREAD_CREATION,
              id: thread.id
            },
            userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
            params: {
              subject: thread.subject,
              messageId: thread.messages.janeMessage.id
            }
          })
        ])
      );
    });

    it('Should send inApp and email to collaborator when owner creates a thread', async () => {
      const requestContext = testsHelper.getUserContext(scenario.users.johnInnovator, 'innovatorRole');

      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const thread = innovation.threads.threadByJohn;

      //only need the display name
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValue({
        displayName: scenario.users.johnInnovator.name
      } as any);

      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValue([
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')
        ]);

      handler = new ThreadCreationHandler(
        requestContext,
        {
          innovationId: innovation.id,
          threadId: thread.id,
          messageId: thread.messages.johnMessage.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.emails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            templateId: EmailTypeEnum.THREAD_CREATION_TO_INNOVATOR_FROM_INNOVATOR,
            notificationPreferenceType: 'MESSAGE',
            to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
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
          })
        ])
      );
      expect(handler.inApp).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            innovationId: innovation.id,
            context: {
              type: NotificationContextTypeEnum.THREAD,
              detail: NotificationContextDetailEnum.THREAD_CREATION,
              id: thread.id
            },
            userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
            params: {
              subject: thread.subject,
              messageId: thread.messages.johnMessage.id
            }
          })
        ])
      );
    });
  });
});
