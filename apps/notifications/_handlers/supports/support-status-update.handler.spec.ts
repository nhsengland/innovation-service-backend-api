import * as crypto from 'crypto';
import { SupportStatusUpdateHandler } from './support-status-update.handler';
import { randText } from '@ngneat/falso';
import { InnovationSupportStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { randomUUID } from 'crypto';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { supportSummaryUrl, surveysInitialPage, threadUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / support-status-update suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const recipients = [
    DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
    DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
  ];

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;

  const message = randText();
  const threadId = randomUUID();

  const requestUser = scenario.users.aliceQualifyingAccessor;
  const requestUserUnit = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit;

  describe('ST01_SUPPORT_STATUS_TO_ENGAGING', () => {
    it('should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST01_SUPPORT_STATUS_TO_ENGAGING', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: support.status,
            message: message,
            newAssignedAccessorsIds: support.accessors.map(a => a.id)
          }
        },
        recipients: recipients,
        outputData: {
          accessors_name: HandlersHelper.transformIntoBullet(support.accessors.map(a => a.name)),
          innovation_name: innovation.name,
          message: message,
          unit_name: requestUserUnit.name,
          message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId, notificationId)
        }
      });
    });

    it('should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST01_SUPPORT_STATUS_TO_ENGAGING', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: support.status,
            message: message,
            newAssignedAccessorsIds: support.accessors.map(a => a.id)
          }
        },
        recipients: recipients,
        outputData: {
          innovationName: innovation.name,
          threadId: threadId,
          unitName: requestUserUnit.name
        },
        notificationId
      });
    });
  });

  describe('ST02_SUPPORT_STATUS_TO_OTHER', () => {
    const supportStatus = InnovationSupportStatusEnum.UNSUITABLE;

    it('when changing status to UNSUITABLE should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST02_SUPPORT_STATUS_TO_OTHER', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: supportStatus,
            message: message
          }
        },
        recipients: recipients,
        outputData: {
          innovation_name: innovation.name,
          unit_name: requestUserUnit.name,
          message: message,
          status: TranslationHelper.translate(`SUPPORT_STATUS.${supportStatus}`).toLowerCase(),
          support_summary_url: supportSummaryUrl(
            ServiceRoleEnum.INNOVATOR,
            innovation.id,
            notificationId,
            requestUserUnit.id
          )
        }
      });
    });

    it('when changing status to UNSUITABLE should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST02_SUPPORT_STATUS_TO_OTHER', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: supportStatus,
            message: message
          }
        },
        recipients: recipients,
        outputData: {
          innovationName: innovation.name,
          unitId: requestUserUnit.id,
          unitName: requestUserUnit.name,
          status: TranslationHelper.translate(`SUPPORT_STATUS.${supportStatus}`).toLowerCase()
        },
        notificationId
      });
    });
  });

  describe('ST09_SUPPORT_STATUS_TO_CLOSED', () => {
    const supportStatus = InnovationSupportStatusEnum.CLOSED;
    it('when changing status to CLOSED should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST09_SUPPORT_STATUS_TO_CLOSED', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: supportStatus,
            message: message
          }
        },
        recipients: recipients,
        outputData: {
          innovation_name: innovation.name,
          unit_name: requestUserUnit.name,
          message: message,
          start_survey_page: surveysInitialPage(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId)
        }
      });
    });

    it('when changing status to CLOSED should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST09_SUPPORT_STATUS_TO_CLOSED', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: supportStatus,
            message: message
          }
        },
        recipients: recipients,
        outputData: {
          innovationName: innovation.name,
          unitId: requestUserUnit.id,
          unitName: requestUserUnit.name
        },
        notificationId
      });
    });
  });

  describe('ST03_SUPPORT_STATUS_TO_WAITING', () => {
    it('should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST03_SUPPORT_STATUS_TO_WAITING', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: InnovationSupportStatusEnum.WAITING,
            message: message,
            newAssignedAccessorsIds: support.accessors.map(a => a.id)
          }
        },
        recipients: recipients,
        outputData: {
          accessors_name: HandlersHelper.transformIntoBullet(support.accessors.map(a => a.name)),
          innovation_name: innovation.name,
          unit_name: requestUserUnit.name,
          message: message,
          support_summary_url: supportSummaryUrl(
            ServiceRoleEnum.INNOVATOR,
            innovation.id,
            notificationId,
            requestUserUnit.id
          )
        }
      });
    });

    it('should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST03_SUPPORT_STATUS_TO_WAITING', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: {
          innovationId: innovation.id,
          threadId: threadId,
          support: {
            id: support.id,
            status: InnovationSupportStatusEnum.WAITING,
            message: message
          }
        },
        recipients: recipients,
        outputData: {
          innovationName: innovation.name,
          unitId: requestUserUnit.id,
          unitName: requestUserUnit.name,
          status: TranslationHelper.translate(`SUPPORT_STATUS.${InnovationSupportStatusEnum.WAITING}`).toLowerCase()
        },
        notificationId
      });
    });
  });
});
