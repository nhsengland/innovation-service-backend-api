import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { dataSharingPreferencesUrl } from '../../../_helpers/url.helper';
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
  const stoppedShareOrg = scenario.organisations.healthOrg;

  describe('SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', () => {
    it('should send an email to innovation owner', async () => {
      await testEmails(InnovationStopSharingHandler, 'SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(requestUser)],
        inputData: {
          innovationId: innovation.id,
          organisationName: stoppedShareOrg.name,
          affectedUsers: []
        },
        outputData: {
          innovation_name: innovation.name,
          organisation_name: stoppedShareOrg.name,
          data_sharing_preferences_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
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
          organisationName: stoppedShareOrg.name,
          affectedUsers: []
        },
        outputData: { innovationName: innovation.name, organisationName: stoppedShareOrg.name },
        options: { includeSelf: true }
      });
    });
  });

  describe('SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A', () => {
    const assignedUsersRecipients = [
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
      DTOsHelper.getRecipientUser(scenario.users.samAccessor)
    ];

    it('should send an email to assigned QA/A', async () => {
      await testEmails(InnovationStopSharingHandler, 'SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          organisationName: stoppedShareOrg.name,
          affectedUsers: assignedUsersRecipients.map(r => ({
            userId: r.userId,
            userType: r.role,
            unitId: r.unitId
          }))
        },
        outputData: {
          innovation_name: innovation.name
        }
      });
    });

    it('should send an in-app to assigned users', async () => {
      await testInApps(InnovationStopSharingHandler, 'SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A', {
        context: { type: 'INNOVATION_MANAGEMENT', id: innovation.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: assignedUsersRecipients,
        inputData: {
          innovationId: innovation.id,
          organisationName: stoppedShareOrg.name,
          affectedUsers: assignedUsersRecipients.map(r => ({
            userId: r.userId,
            userType: r.role,
            unitId: r.unitId
          }))
        },
        outputData: { innovationName: innovation.name }
      });
    });
  });
});
