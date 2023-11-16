import { InnovationTransferStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { manageInnovationUrl } from '../../../_helpers/url.helper';
import { RecipientsService } from '../../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { InnovationTransferOwnershipCompletedHandler } from './innovation-transfer-ownership-completed.handler';

describe('Notifications / _handlers / innovation-transfer-ownership-completed handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.adamInnovator.innovations.adamInnovation;
  const previousInnovationOwner = scenario.users.adamInnovator;
  const newInnovationOwner = scenario.users.janeInnovator;
  const assignedAccessors = [
    DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
    DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
  ];

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovationInfoMock = jest.spyOn(RecipientsService.prototype, 'innovationInfo');
  const transferMock = jest.spyOn(RecipientsService.prototype, 'innovationTransferInfoWithOwner');

  describe('Innovation transfer completed to state COMPLETED', () => {
    beforeEach(() => {
      innovationInfoMock.mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: newInnovationOwner.id,
        ownerIdentityId: newInnovationOwner.identityId
      });
      transferMock.mockResolvedValueOnce({
        id: innovation.id,
        email: newInnovationOwner.email,
        status: InnovationTransferStatusEnum.COMPLETED,
        ownerId: previousInnovationOwner.id
      });
    });

    describe('TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER', () => {
      it('Should send email to transfer creator', async () => {
        await testEmails(
          InnovationTransferOwnershipCompletedHandler,
          'TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER',
          {
            notificationPreferenceType: 'INNOVATION_MANAGEMENT',
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovation_name: innovation.name,
              new_innovation_owner: newInnovationOwner.name
            },
            recipients: [DTOsHelper.getRecipientUser(previousInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });

      it('Should send inapp to transfer creator', async () => {
        await testInApps(
          InnovationTransferOwnershipCompletedHandler,
          'TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER',
          {
            context: {
              id: innovation.id,
              type: 'INNOVATION_MANAGEMENT'
            },
            innovationId: innovation.id,
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovationName: innovation.name,
              newInnovationOwner: newInnovationOwner.name
            },
            recipients: [DTOsHelper.getRecipientUser(previousInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });
    });

    describe('TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS', () => {
      it('Should not send email to assigned accessors', async () => {
        await testEmails(
          InnovationTransferOwnershipCompletedHandler,
          'TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS',
          {
            notificationPreferenceType: 'INNOVATION_MANAGEMENT',
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {},
            recipients: [],
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });

      it('Should send inapp to assigned accessors', async () => {
        await testInApps(
          InnovationTransferOwnershipCompletedHandler,
          'TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS',
          {
            context: {
              id: innovation.id,
              type: 'INNOVATION_MANAGEMENT'
            },
            innovationId: innovation.id,
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovationName: innovation.name,
              newInnovationOwnerName: newInnovationOwner.name,
              oldInnovationOwnerName: previousInnovationOwner.name
            },
            recipients: assignedAccessors,
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });
    });
  });

  describe('Innovation transfer completed to state DECLINED', () => {
    beforeEach(() => {
      innovationInfoMock.mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: previousInnovationOwner.id,
        ownerIdentityId: previousInnovationOwner.identityId
      });
      transferMock.mockResolvedValueOnce({
        id: innovation.id,
        email: newInnovationOwner.email,
        status: InnovationTransferStatusEnum.DECLINED,
        ownerId: previousInnovationOwner.id
      });
    });
    describe('TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER', () => {
      it('Should send email to transfer creator', async () => {
        await testEmails(
          InnovationTransferOwnershipCompletedHandler,
          'TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER',
          {
            notificationPreferenceType: 'INNOVATION_MANAGEMENT',
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovation_name: innovation.name,
              new_innovation_owner: newInnovationOwner.name,
              manage_innovation_url: manageInnovationUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
            },
            recipients: [DTOsHelper.getRecipientUser(previousInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });

      it('Should send inapp to transfer creator', async () => {
        await testInApps(
          InnovationTransferOwnershipCompletedHandler,
          'TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER',
          {
            context: {
              id: innovation.id,
              type: 'INNOVATION_MANAGEMENT'
            },
            innovationId: innovation.id,
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovationName: innovation.name
            },
            recipients: [DTOsHelper.getRecipientUser(previousInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(newInnovationOwner)
          }
        );
      });
    });
  });

  describe('Innovation transfer completed to state CANCELED', () => {
    describe('target user exists', () => {
      beforeEach(() => {
        innovationInfoMock.mockResolvedValueOnce({
          id: innovation.id,
          name: innovation.name,
          ownerId: previousInnovationOwner.id,
          ownerIdentityId: previousInnovationOwner.identityId
        });
        transferMock.mockResolvedValueOnce({
          id: innovation.id,
          email: newInnovationOwner.email,
          status: InnovationTransferStatusEnum.CANCELED,
          ownerId: previousInnovationOwner.id
        });
      });

      describe('TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', () => {
        it('Should send email to transfer creator', async () => {
          await testEmails(InnovationTransferOwnershipCompletedHandler, 'TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', {
            notificationPreferenceType: 'INNOVATION_MANAGEMENT',
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovation_name: innovation.name,
              innovator_name: previousInnovationOwner.name
            },
            recipients: [DTOsHelper.getRecipientUser(newInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(previousInnovationOwner)
          });
        });

        it('Should send inapp to transfer creator', async () => {
          await testInApps(InnovationTransferOwnershipCompletedHandler, 'TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', {
            context: {
              id: innovation.id,
              type: 'INNOVATION_MANAGEMENT'
            },
            innovationId: innovation.id,
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovationName: innovation.name,
              innovationOwner: previousInnovationOwner.name
            },
            recipients: [DTOsHelper.getRecipientUser(newInnovationOwner)],
            requestUser: DTOsHelper.getUserRequestContext(previousInnovationOwner)
          });
        });
      });
    });

    describe("target user doesn't exist", () => {
      beforeEach(() => {
        innovationInfoMock.mockResolvedValueOnce({
          id: innovation.id,
          name: innovation.name,
          ownerId: previousInnovationOwner.id,
          ownerIdentityId: previousInnovationOwner.identityId
        });
        transferMock.mockResolvedValueOnce({
          id: innovation.id,
          email: 'test@example.org',
          status: InnovationTransferStatusEnum.CANCELED,
          ownerId: previousInnovationOwner.id
        });
      });

      describe('TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', () => {
        it('Should send email to transfer creator', async () => {
          await testEmails(InnovationTransferOwnershipCompletedHandler, 'TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER', {
            notificationPreferenceType: 'INNOVATION_MANAGEMENT',
            inputData: {
              innovationId: innovation.id,
              transferId: innovation.transfer.id
            },
            outputData: {
              innovation_name: innovation.name,
              innovator_name: previousInnovationOwner.name
            },
            recipients: [{ email: 'test@example.org', displayname: '' }],
            requestUser: DTOsHelper.getUserRequestContext(previousInnovationOwner)
          });
        });

        it('Should not send inapp to transfer creator', async () => {
          const handler = new InnovationTransferOwnershipCompletedHandler(
            DTOsHelper.getUserRequestContext(previousInnovationOwner),
            { innovationId: innovation.id, transferId: innovation.transfer.id },
            MocksHelper.mockContext()
          );
          await handler.run();
          expect(handler.inApp.length).toBe(0);
        });
      });
    });
  });
});
