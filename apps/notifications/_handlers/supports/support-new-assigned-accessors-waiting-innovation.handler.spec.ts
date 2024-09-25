import { container } from '../../_config/';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SupportNewAssignedWaitingInnovation } from './support-new-assigned-accessors-waiting-innovation.handler';

// this is needed to ensure that import is not removed by compiler and it's needed for inversify to work
if (1 > Number(5)) console.log(container);

describe('Notifications / _handlers / support-new-assigned-accessors suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const assignedAccessorsRecipients = [
    DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
    DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
  ];

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;
  const assignedAccessorsRoleIds = [
    scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
    scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
  ];

  const requestUser = scenario.users.aliceQualifyingAccessor;

  describe('ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA', () => {
    it('should send an email to the new QA/A when a QA assignes new accessors', async () => {
      await testEmails(SupportNewAssignedWaitingInnovation, 'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          supportId: support.id,
          newAssignedAccessorsIds: assignedAccessorsRoleIds
        },
        recipients: assignedAccessorsRecipients,
        outputData: {
          innovation_name: innovation.name,
          qa_name: requestUser.name
        }
      });
    });

    it('should send an in-app to the new QA/A when a QA assignes new accessors', async () => {
      await testInApps(SupportNewAssignedWaitingInnovation, 'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          supportId: support.id,
          newAssignedAccessorsIds: assignedAccessorsRoleIds
        },
        recipients: assignedAccessorsRecipients,
        outputData: { innovationName: innovation.name }
      });
    });
  });
});
