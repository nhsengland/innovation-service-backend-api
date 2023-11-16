import { randText } from '@ngneat/falso';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { randomUUID } from 'crypto';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl, threadUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SupportNewAssignedAccessorsHandler } from './support-new-assigned-accessors.handler';

describe('Notifications / _handlers / support-new-assigned-accessors suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovatorRecipients = [
    DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
    DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
  ];
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

  const message = randText();
  const threadId = randomUUID();

  const requestUser = scenario.users.aliceQualifyingAccessor;
  const requestUserUnit = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit;

  describe('ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR', () => {
    it('should send an email to the innovators when a QA assignes new accessors', async () => {
      await testEmails(SupportNewAssignedAccessorsHandler, 'ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: assignedAccessorsRoleIds,
          removedAssignedAccessorsRoleIds: []
        },
        recipients: innovatorRecipients,
        outputData: {
          unit_name: requestUserUnit.name,
          innovation_name: innovation.name,
          accessors_name: HandlersHelper.transformIntoBullet(support.accessors.map(a => a.name)),
          message: message,
          message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId)
        }
      });
    });

    it('should send an in-app to the innovators when a QA assignes new accessors', async () => {
      await testInApps(SupportNewAssignedAccessorsHandler, 'ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: assignedAccessorsRoleIds,
          removedAssignedAccessorsRoleIds: []
        },
        recipients: innovatorRecipients,
        outputData: {
          innovationName: innovation.name,
          unitName: requestUserUnit.name,
          threadId: threadId
        }
      });
    });
  });

  describe('ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', () => {
    it('should send an email to the new QA/A when a QA assignes new accessors', async () => {
      await testEmails(SupportNewAssignedAccessorsHandler, 'ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: assignedAccessorsRoleIds,
          removedAssignedAccessorsRoleIds: []
        },
        recipients: assignedAccessorsRecipients,
        outputData: {
          innovation_name: innovation.name,
          qa_name: requestUser.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
        }
      });
    });

    it('should send an in-app to the new QA/A when a QA assignes new accessors', async () => {
      await testInApps(SupportNewAssignedAccessorsHandler, 'ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: assignedAccessorsRoleIds,
          removedAssignedAccessorsRoleIds: []
        },
        recipients: assignedAccessorsRecipients,
        outputData: { innovationName: innovation.name }
      });
    });
  });

  describe('ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', () => {
    it('should send an email to the removed QA/A when a QA assignes new accessors', async () => {
      await testEmails(SupportNewAssignedAccessorsHandler, 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: [assignedAccessorsRoleIds[0]!],
          removedAssignedAccessorsRoleIds: [assignedAccessorsRoleIds[1]!]
        },
        recipients: assignedAccessorsRecipients.filter(r => r.userId === scenario.users.jamieMadroxAccessor.id),
        outputData: { innovation_name: innovation.name }
      });
    });

    it('should send an in-app to the removed QA/A when a QA assignes new accessors', async () => {
      await testInApps(SupportNewAssignedAccessorsHandler, 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          supportId: support.id,
          message: message,
          newAssignedAccessorsRoleIds: [assignedAccessorsRoleIds[0]!],
          removedAssignedAccessorsRoleIds: [assignedAccessorsRoleIds[1]!]
        },
        recipients: assignedAccessorsRecipients.filter(r => r.userId === scenario.users.jamieMadroxAccessor.id),
        outputData: { innovationName: innovation.name }
      });
    });
  });
});
