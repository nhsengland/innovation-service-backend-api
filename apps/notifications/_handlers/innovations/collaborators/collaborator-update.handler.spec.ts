import { InnovationCollaboratorStatusEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { manageCollaboratorsUrl } from '../../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { CollaboratorUpdateHandler } from './collaborator-update.handler';

describe('Notifications / _handlers / collaborator-update suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.johnInnovator;
  const innovation = requestUser.innovations.johnInnovation;

  describe('MC03_COLLABORATOR_UPDATE_CANCEL_INVITE', () => {
    const collaboratorExistingUser = innovation.collaborators.adamCollaborator;
    const collaborationNewUser = innovation.collaborators.elisaPendingCollaborator;

    it('should send an email to the collaborator (existing user)', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC03_COLLABORATOR_UPDATE_CANCEL_INVITE', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.adamInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaboratorExistingUser.id, status: InnovationCollaboratorStatusEnum.CANCELLED }
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name
        }
      });
    });

    it('should send an in-app to the collaborator (existing user)', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC03_COLLABORATOR_UPDATE_CANCEL_INVITE', {
        context: { id: collaboratorExistingUser.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.adamInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaboratorExistingUser.id, status: InnovationCollaboratorStatusEnum.CANCELLED }
        },
        outputData: {
          innovationName: innovation.name,
          requestUserName: requestUser.name,
          collaboratorId: collaboratorExistingUser.id
        }
      });
    });

    it("should send an email to the collaborator (new user) and don't send in-app", async () => {
      const handler = new CollaboratorUpdateHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        {
          innovationId: innovation.id,
          collaborator: { id: collaborationNewUser.id, status: InnovationCollaboratorStatusEnum.CANCELLED }
        },
        MocksHelper.mockContext()
      );

      await handler.run();
      expect(handler.emails).toStrictEqual([
        {
          templateId: 'MC03_COLLABORATOR_UPDATE_CANCEL_INVITE',
          notificationPreferenceType: 'INNOVATION_MANAGEMENT',
          to: { email: collaborationNewUser.email },
          params: {
            innovator_name: requestUser.name,
            innovation_name: innovation.name
          }
        }
      ]);
      expect(handler.inApp).toHaveLength(0);
    });
  });

  describe('MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE', () => {
    const requestUser = scenario.users.adamInnovator;
    const collaborator = innovation.collaborators.adamCollaborator;

    it('should send an email to owner', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.ACTIVE }
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name,
          manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
        }
      });
    });

    it('should send an in-app to the owner', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE', {
        context: { id: collaborator.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.ACTIVE }
        },
        outputData: {
          collaboratorId: collaborator.id,
          innovationName: innovation.name,
          requestUserName: requestUser.name
        }
      });
    });
  });

  describe('MC05_COLLABORATOR_UPDATE_DECLINES_INVITE', () => {
    const requestUser = scenario.users.adamInnovator;
    const collaborator = innovation.collaborators.adamCollaborator;

    it('should send an email to owner', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC05_COLLABORATOR_UPDATE_DECLINES_INVITE', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.DECLINED }
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name,
          manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
        }
      });
    });

    it('should send an in-app to the owner', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC05_COLLABORATOR_UPDATE_DECLINES_INVITE', {
        context: { id: collaborator.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.DECLINED }
        },
        outputData: {
          collaboratorId: collaborator.id,
          innovationName: innovation.name,
          requestUserName: requestUser.name
        }
      });
    });
  });

  describe('MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR', () => {
    const requestUser = scenario.users.johnInnovator;
    const collaborator = innovation.collaborators.janeCollaborator;

    it('should send an email to the removed collaborator', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.REMOVED }
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name
        }
      });
    });

    it('should send an in-app to the removed collaborator', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR', {
        context: { id: collaborator.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.REMOVED }
        },
        outputData: {
          collaboratorId: collaborator.id,
          innovationName: innovation.name,
          requestUserName: requestUser.name
        }
      });
    });
  });

  describe('MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS', () => {
    const requestUser = scenario.users.janeInnovator;
    const collaborator = innovation.collaborators.adamCollaborator;

    it('should send an email to innovators', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
        ],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.LEFT }
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name,
          manage_collaborators_url: manageCollaboratorsUrl(innovation.id)
        }
      });
    });

    it('should send an in-app to the innovators', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS', {
        context: { id: collaborator.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [
          DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
        ],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.LEFT }
        },
        outputData: {
          collaboratorId: collaborator.id,
          innovationName: innovation.name,
          requestUserName: requestUser.name
        }
      });
    });
  });

  describe('MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF', () => {
    const requestUser = scenario.users.janeInnovator;
    const collaborator = innovation.collaborators.janeCollaborator;

    it('should send an email receipt to the collaborator who lefted', async () => {
      await testEmails(CollaboratorUpdateHandler, 'MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.LEFT }
        },
        outputData: { innovation_name: innovation.name },
        options: { includeSelf: true }
      });
    });

    it('should send an in-app receipt to the collaborator who lefted', async () => {
      await testInApps(CollaboratorUpdateHandler, 'MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF', {
        context: { id: collaborator.id, type: 'INNOVATION_MANAGEMENT' },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.janeInnovator)],
        inputData: {
          innovationId: innovation.id,
          collaborator: { id: collaborator.id, status: InnovationCollaboratorStatusEnum.LEFT }
        },
        outputData: { innovationName: innovation.name, collaboratorId: collaborator.id },
        options: { includeSelf: true }
      });
    });
  });
});
