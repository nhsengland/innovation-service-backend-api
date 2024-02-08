import { randText } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { InnovationStopSharingHandler } from './innovation-stop-sharing.handler';

describe('Notifications / _handlers / innovation-stop-sharing suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const requestUser = scenario.users.johnInnovator;
  const innovation = requestUser.innovations.johnInnovation;
  const message = randText();

  describe('SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS', () => {
    const assignedUsersRecipients = [
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
      DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
      DTOsHelper.getRecipientUser(scenario.users.samAccessor)
    ];

    it('should send an email to assigned users', async () => {
      await testEmails(InnovationStopSharingHandler, 'SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: assignedUsersRecipients.map(r => ({
            id: r.userId,
            role: r.role,
            unitId: r.unitId
          }))
        },
        outputData: {
          innovation_name: innovation.name,
          innovator_name: requestUser.name,
          comment: message
        }
      });
    });

    it('should send an in-app to assigned users', async () => {
      await testInApps(InnovationStopSharingHandler, 'SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: assignedUsersRecipients.map(r => ({
            id: r.userId,
            role: r.role,
            unitId: r.unitId
          }))
        },
        outputData: { innovationName: innovation.name }
      });
    });
  });

  describe('SH03_INNOVATION_STOPPED_SHARED_TO_SELF', () => {
    it('should send an email to innovation owner', async () => {
      await testEmails(InnovationStopSharingHandler, 'SH03_INNOVATION_STOPPED_SHARED_TO_SELF', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(requestUser)],
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: []
        },
        outputData: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
        },
        options: { includeSelf: true }
      });
    });

    it('should send an in-app to innovation owner', async () => {
      await testInApps(InnovationStopSharingHandler, 'SH03_INNOVATION_STOPPED_SHARED_TO_SELF', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(requestUser)],
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: []
        },
        outputData: { innovationName: innovation.name },
        options: { includeSelf: true }
      });
    });
  });

  describe('SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', () => {
    it('should send an email to innovation owner', async () => {
      await testEmails(InnovationStopSharingHandler, 'SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(requestUser)],
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: []
        },
        outputData: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
        },
        options: { includeSelf: true }
      });
    });

    it('should send an in-app to innovation owner', async () => {
      await testInApps(InnovationStopSharingHandler, 'SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(requestUser)],
        inputData: {
          innovationId: innovation.id,
          message,
          affectedUsers: []
        },
        outputData: { innovationName: innovation.name },
        options: { includeSelf: true }
      });
    });
  });
});
