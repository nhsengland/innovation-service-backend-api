import { ENV } from '../../_config';
import { InnovationCollaboratorInviteHandler } from './innovation-collaborator-invite.handler';

import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';

import { InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { randomUUID } from 'crypto';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';

describe('Notifications / _handlers / innovation-collaborator-invite suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new NotificationsTestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('when a user outside the service is invited to be a collaborator', () => {
    it('should send an email', async () => {
      const innovationOwnerContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const collaborator = innovation.collaborators.elisaPendingCollaborator;

      // mocks
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        name: innovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });

      const handler = new InnovationCollaboratorInviteHandler(
        innovationOwnerContext,
        {
          innovationId: innovation.id,
          innovationCollaboratorId: collaborator.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.inApp).toHaveLength(0);
      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_COLLABORATOR_INVITE_TO_NEW_USER',
          to: { email: collaborator.email },
          notificationPreferenceType: null,
          params: {
            innovator_name: scenario.users.johnInnovator.name,
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(`innovations/${innovation.id}/collaborations/${collaborator.id}`)
              .buildUrl()
          }
        }
      ]);
    });
  });

  describe('when a user from the service is invited to be a collaborator', () => {
    it('should send an email and an inapp', async () => {
      const innovationOwnerContext = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const collaborator = innovation.collaborators.janeCollaborator;

      // mocks
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        name: innovation.name,
        ownerId: innovationOwnerContext.id,
        ownerIdentityId: innovationOwnerContext.identityId
      });
      const mockedInnovationCollaborator = DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole');
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValue(mockedInnovationCollaborator);

      const handler = new InnovationCollaboratorInviteHandler(
        innovationOwnerContext,
        {
          innovationId: innovation.id,
          innovationCollaboratorId: collaborator.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(1);
      expect(handler.inApp).toHaveLength(1);
      expect(handler.emails).toMatchObject([
        {
          templateId: 'INNOVATION_COLLABORATOR_INVITE_TO_EXISTING_USER',
          to: mockedInnovationCollaborator,
          notificationPreferenceType: null,
          params: {
            innovator_name: scenario.users.johnInnovator.name,
            innovation_name: innovation.name,
            transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(`innovator/innovations/${innovation.id}/collaborations/${collaborator.id}`)
              .buildUrl()
          }
        }
      ]);
      expect(handler.inApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.INNOVATION,
            detail: NotificationContextDetailEnum.COLLABORATOR_INVITE,
            id: collaborator.id
          },
          userRoleIds: [mockedInnovationCollaborator.roleId],
          params: {
            collaboratorId: collaborator.id
          }
        }
      ]);
    });
  });

  describe('when a user is invited to an innovation without owner', () => {
    it('should throw a not found error', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      // This will never happen, but we have to test it anyways.
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        name: innovation.name,
        ownerId: undefined,
        ownerIdentityId: undefined
      });

      const handler = new InnovationCollaboratorInviteHandler(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaboratorId: innovation.collaborators.janeCollaborator.id
        },
        MocksHelper.mockContext()
      );

      await expect(() => handler.run()).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_OWNER_NOT_FOUND)
      );
    });
  });

  describe('when a user is invited to an innovation and the owner doesnt exist on B2C', () => {
    it('should throw a not found error', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      // This will never happen, but we have to test it anyways.
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        name: innovation.name,
        ownerId: undefined,
        ownerIdentityId: randomUUID()
      });

      const handler = new InnovationCollaboratorInviteHandler(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'),
        {
          innovationId: innovation.id,
          innovationCollaboratorId: innovation.collaborators.janeCollaborator.id
        },
        MocksHelper.mockContext()
      );

      await expect(() => handler.run()).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_OWNER_NOT_FOUND)
      );
    });
  });
});
