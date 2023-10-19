import { InnovationCollaboratorUpdateHandler } from './innovation-collaborator-update.handler';

import {
  InnovationCollaboratorStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@notifications/shared/enums';
import { InnovationErrorsEnum, NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';

describe('Notifications / _handlers / innovation-collborator-update handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let collaborator: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['collaborators']['janeCollaborator'];
  let collaboratorUser: CompleteScenarioType['users']['janeInnovator'];

  let handler: InnovationCollaboratorUpdateHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    collaborator = innovation.collaborators.janeCollaborator;
    collaboratorUser = scenario.users.janeInnovator;
  });

  describe.each([
    [InnovationCollaboratorStatusEnum.ACTIVE, 'INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER' as const],
    [InnovationCollaboratorStatusEnum.DECLINED, 'INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER' as const]
  ])('Collaborator status updated to %s', (collaboratorStatus, templateId) => {
    let innovationUrl: string | undefined = undefined;

    // beforeEach(() => {
    //   // mock innovation info
    //   jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
    //     name: innovation.name,
    //     ownerId: innovationOwner.id,
    //     ownerIdentityId: innovationOwner.identityId
    //   });
    //   // mock innovation owner info
    //   jest
    //     .spyOn(RecipientsService.prototype, 'getUsersRecipient')
    //     .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    // });

    describe('Collaborator does not exist in the service yet', () => {
      beforeAll(() => {
        // mock innovation info
        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          id: innovation.id,
          name: innovation.name,
          ownerId: innovationOwner.id,
          ownerIdentityId: innovationOwner.identityId
        });
        // mock innovation owner info
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
        handler = new InnovationCollaboratorUpdateHandler(
          DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
          {
            innovationId: innovation.id,
            innovationCollaborator: {
              id: collaborator.id,
              status: collaboratorStatus
            }
          },
          MocksHelper.mockContext()
        );
      });

      it('Should throw a not found error when the collaborator has no userId', async () => {
        // mock collaborator info
        jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
          collaboratorId: collaborator.id,
          userId: null,
          email: collaboratorUser.email,
          status: collaboratorStatus
        });

        await expect(() => handler.run()).rejects.toThrowError(
          new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_MUST_BE_INNOVATOR)
        );
      });

      it('Should throw a not found error when the collaborator has no identityId', async () => {
        // mock collaborator info
        jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
          collaboratorId: collaborator.id,
          userId: collaboratorUser.id,
          email: collaboratorUser.email,
          status: collaboratorStatus
        });
        // mock collaborator identity info
        jest.spyOn(RecipientsService.prototype, 'userId2IdentityId').mockResolvedValueOnce(null);

        await expect(() => handler.run()).rejects.toThrowError(
          new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND)
        );
      });
    });

    it('Should send an email to the innovation owner when the collaborator exists in the service as an innovator', async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: collaboratorUser.id,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      if (collaboratorStatus === InnovationCollaboratorStatusEnum.ACTIVE) {
        innovationUrl = new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/manage/innovation/collaborators')
          .setPathParams({ innovationId: innovation.id })
          .buildUrl();
      }

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        templateId,
        to: DTOsHelper.getRecipientUser(innovationOwner),
        notificationPreferenceType: null,
        params: {
          collaborator_name: collaboratorUser.name,
          innovation_name: innovation.name,
          ...(innovationUrl && { innovation_url: innovationUrl })
        }
      });
    });
  });

  describe('Collaborator status updated to CANCELLED', () => {
    const collaboratorStatus = InnovationCollaboratorStatusEnum.CANCELLED;
    const templateId = 'INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR';

    beforeAll(() => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      // mock innovation owner recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    });

    it(`Should send an email to the collaborator that doesn't exist in the service yet`, async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: null,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        to: { email: collaboratorUser.email },
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: innovationOwner.name,
          innovation_name: innovation.name
        }
      });
    });

    describe('Collaborator exists in the service as an innovator', () => {
      beforeAll(async () => {
        // mock collaborator info
        jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
          collaboratorId: collaborator.id,
          userId: collaboratorUser.id,
          email: collaboratorUser.email,
          status: collaboratorStatus
        });

        // mock collaborator recipient
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

        handler = new InnovationCollaboratorUpdateHandler(
          DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
          {
            innovationId: innovation.id,
            innovationCollaborator: {
              id: collaborator.id,
              status: collaboratorStatus
            }
          },
          MocksHelper.mockContext()
        );

        await handler.run();
      });

      it('Should send an email to the collaborator', () => {
        const expectedEmail = handler.emails.find(email => email.templateId === templateId);

        expect(expectedEmail).toMatchObject({
          to: DTOsHelper.getRecipientUser(collaboratorUser),
          notificationPreferenceType: null,
          templateId,
          params: {
            innovator_name: innovationOwner.name,
            innovation_name: innovation.name
          }
        });
      });

      it('Should send an inApp to the collaborator', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(collaboratorUser.roles.innovatorRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.COLLABORATOR_UPDATE,
            id: innovation.id
          },
          userRoleIds: [collaboratorUser.roles.innovatorRole.id],
          params: {
            collaboratorId: collaborator.id
          }
        });
      });
    });
    it('Should replace innovation owner name in email to collaborator when innovation owner is not found', async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: collaboratorUser.id,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      // mock collaborator recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

      // mock innovation owner identity info
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        to: DTOsHelper.getRecipientUser(collaboratorUser),
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: 'user ',
          innovation_name: innovation.name
        }
      });
    });
  });

  describe('Collaborator status updated to REMOVED', () => {
    const collaboratorStatus = InnovationCollaboratorStatusEnum.REMOVED;
    const templateId = 'INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR';

    beforeAll(() => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      // mock innovation owner info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      // mock innovation owner info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    });

    it('Should send email to collaborator that does not exist in the service yet', async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: null,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        to: { email: collaboratorUser.email },
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: innovationOwner.name,
          innovation_name: innovation.name
        }
      });
    });

    it('Should send email to collaborator that exists in the service as an innovator', async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: collaboratorUser.id,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      // mock collaborator recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        to: DTOsHelper.getRecipientUser(collaboratorUser),
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: innovationOwner.name,
          innovation_name: innovation.name
        }
      });
    });

    it('Should replace innovation owner name when innovation owner is not found', async () => {
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: collaboratorUser.id,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      // mock collaborator recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

      // mock innovation owner identity info
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedEmail = handler.emails.find(email => email.templateId === templateId);

      expect(expectedEmail).toMatchObject({
        to: DTOsHelper.getRecipientUser(collaboratorUser),
        notificationPreferenceType: null,
        templateId,
        params: {
          innovator_name: 'user ',
          innovation_name: innovation.name
        }
      });
    });
  });

  describe('Collaborator status updated to LEFT', () => {
    const collaboratorStatus = InnovationCollaboratorStatusEnum.LEFT;

    let otherCollaborator: CompleteScenarioType['users']['adamInnovator'];

    const templateIdToOwner = 'INNOVATION_COLLABORATOR_LEAVES_TO_OWNER';
    const templateIdToCollaborator = 'INNOVATION_COLLABORATOR_LEAVES_TO_COLLABORATOR';
    const templateIdToOtherCollaborators = 'INNOVATION_COLLABORATOR_LEAVES_TO_OTHER_COLLABORATORS';

    let innovationUrl: string;

    beforeAll(async () => {
      otherCollaborator = scenario.users.adamInnovator;

      innovationUrl = new UrlModel(ENV.webBaseTransactionalUrl)
        .addPath('innovator/innovations/:innovationId')
        .setPathParams({ innovationId: innovation.id })
        .buildUrl();

      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      // mock innovation owner info
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
      // mock collaborator info
      jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
        collaboratorId: collaborator.id,
        userId: collaboratorUser.id,
        email: collaboratorUser.email,
        status: collaboratorStatus
      });

      // mock collaborator recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

      // mock active collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([otherCollaborator.id]);
      //mock active collaborators recipients
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(otherCollaborator)]);

      handler = new InnovationCollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaborator: {
            id: collaborator.id,
            status: collaboratorStatus
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    // beforeEach(async () => {
    //   // mock innovation info
    //   jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
    //     name: innovation.name,
    //     ownerId: innovationOwner.id,
    //     ownerIdentityId: innovationOwner.identityId
    //   });
    //   // mock innovation owner info
    //   jest
    //     .spyOn(RecipientsService.prototype, 'getUsersRecipient')
    //     .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    //   // mock collaborator info
    //   jest.spyOn(RecipientsService.prototype, 'innovationCollaborationInfo').mockResolvedValueOnce({
    //     collaboratorId: collaborator.id,
    //     userId: collaboratorUser.id,
    //     email: collaboratorUser.email,
    //     status: collaboratorStatus
    //   });

    //   // mock collaborator recipient
    //   jest
    //     .spyOn(RecipientsService.prototype, 'getUsersRecipient')
    //     .mockResolvedValueOnce(DTOsHelper.getRecipientUser(collaboratorUser));

    //   // mock active collaborators
    //   jest
    //     .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
    //     .mockResolvedValueOnce([otherCollaborator.id]);
    //   //mock active collaborators recipients
    //   jest
    //     .spyOn(RecipientsService.prototype, 'getUsersRecipient')
    //     .mockResolvedValueOnce([DTOsHelper.getRecipientUser(otherCollaborator)]);

    //   handler = new InnovationCollaboratorUpdateHandler(
    //     DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
    //     {
    //       innovationId: innovation.id,
    //       innovationCollaborator: {
    //         id: collaborator.id,
    //         status: collaboratorStatus
    //       }
    //     },
    //     MocksHelper.mockContext()
    //   );

    //   await handler.run();
    // });

    it('Should send an email to the innovation owner', () => {
      const expectedEmail = handler.emails.find(email => email.templateId === templateIdToOwner);

      expect(expectedEmail).toMatchObject({
        templateId: templateIdToOwner,
        to: DTOsHelper.getRecipientUser(innovationOwner),
        notificationPreferenceType: null,
        params: {
          collaborator_name: collaboratorUser.name,
          innovation_name: innovation.name,
          innovation_url: innovationUrl
        }
      });
    });

    it('Should send an email to the collaborator', () => {
      const expectedEmail = handler.emails.find(email => email.templateId === templateIdToCollaborator);

      expect(expectedEmail).toMatchObject({
        to: DTOsHelper.getRecipientUser(collaboratorUser),
        notificationPreferenceType: null,
        templateId: templateIdToCollaborator,
        params: {
          innovator_name: innovationOwner.name,
          innovation_name: innovation.name
        }
      });
    });

    it('Should send an email to the other collaborators', () => {
      const expectedEmail = handler.emails.find(email => email.templateId === templateIdToOtherCollaborators);

      expect(expectedEmail).toMatchObject({
        to: DTOsHelper.getRecipientUser(otherCollaborator),
        notificationPreferenceType: null,
        templateId: templateIdToOtherCollaborators,
        params: {
          collaborator_name: collaboratorUser.name,
          innovation_name: innovation.name,
          innovation_url: innovationUrl
        }
      });
    });
  });

  describe('Innovation owner is not found', () => {
    beforeEach(() => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });
      // mock innovation owner info
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(null);
    });

    it.each([
      [InnovationCollaboratorStatusEnum.ACTIVE, 'INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER'],
      [InnovationCollaboratorStatusEnum.DECLINED, 'INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER'],
      [InnovationCollaboratorStatusEnum.LEFT, 'INNOVATION_COLLABORATOR_LEAVES_TO_OWNER']
    ])(
      'Should not send any email to the innovation owner when collaborator status is updated to %s',
      async (collaboratorStatus, templateId) => {
        handler = new InnovationCollaboratorUpdateHandler(
          DTOsHelper.getUserRequestContext(collaboratorUser, 'innovatorRole'),
          {
            innovationId: innovation.id,
            innovationCollaborator: {
              id: collaborator.id,
              status: collaboratorStatus
            }
          },
          MocksHelper.mockContext()
        );

        await handler.run();
        const expectedEmail = handler.emails.find(email => email.templateId === templateId);

        expect(expectedEmail).toBeUndefined();
      }
    );
  });
});
