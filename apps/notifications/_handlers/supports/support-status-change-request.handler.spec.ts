import * as crypto from 'crypto';
import { randText } from '@ngneat/falso';
import { InnovationSupportStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SupportStatusChangeRequestHandler } from './support-status-change-request.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / support-new-assigned-accessors suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;

  const message = randText();
  const status = TranslationHelper.translate(`SUPPORT_STATUS.UNSUITABLE`).toLowerCase();

  const requestUser = scenario.users.jamieMadroxAccessor;

  describe('ST07_SUPPORT_STATUS_CHANGE_REQUEST', () => {
    it('should send an email to the QAs when accessor requests status update', async () => {
      await testEmails(SupportStatusChangeRequestHandler, 'ST07_SUPPORT_STATUS_CHANGE_REQUEST', {
        notificationPreferenceType: 'SUPPORT',
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
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId),
          proposed_status: status,
          request_comment: message
        }
      });
    });

    it('should send an inapp to the QAs when accessor requests status update', async () => {
      await testInApps(SupportStatusChangeRequestHandler, 'ST07_SUPPORT_STATUS_CHANGE_REQUEST', {
        context: {
          id: support.id,
          type: 'SUPPORT'
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
          status
        },
        notificationId
      });
    });
  });
});
