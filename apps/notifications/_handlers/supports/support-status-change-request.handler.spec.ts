import { randText } from '@ngneat/falso';
import { InnovationSupportStatusEnum, NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SupportStatusChangeRequestHandler } from './support-status-change-request.handler';

describe('Notifications / _handlers / support-new-assigned-accessors suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;

  const message = randText();

  const requestUser = scenario.users.jamieMadroxAccessor;

  describe('ST07_SUPPORT_STATUS_CHANGE_REQUEST', () => {
    it('should send an email to the QAs when accessor requests status update', async () => {
      await testEmails(SupportStatusChangeRequestHandler, 'ST07_SUPPORT_STATUS_CHANGE_REQUEST', {
        notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
        requestUser: DTOsHelper.getUserRequestContext(requestUser, 'healthAccessorRole'),
        inputData: {
          innovationId: innovation.id,
          supportId: support.id,
          proposedStatus: InnovationSupportStatusEnum.UNSUITABLE,
          requestStatusUpdateComment: message
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        outputData: {
          accessor_name: requestUser.name,
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id),
          proposed_status: InnovationSupportStatusEnum.UNSUITABLE,
          request_comment: message
        }
      });
    });

    it('should send an inapp to the QAs when accessor requests status update', async () => {
      await testInApps(SupportStatusChangeRequestHandler, 'ST07_SUPPORT_STATUS_CHANGE_REQUEST', {
        context: {
          id: innovation.id,
          type: NotificationCategoryEnum.SUPPORT
        },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser, 'healthAccessorRole'),
        inputData: {
          innovationId: innovation.id,
          supportId: support.id,
          proposedStatus: InnovationSupportStatusEnum.UNSUITABLE,
          requestStatusUpdateComment: message
        },
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        outputData: {
          accessorName: requestUser.name,
          innovationName: innovation.name,
          proposedStatus: InnovationSupportStatusEnum.UNSUITABLE
        }
      });
    });
  });
});
