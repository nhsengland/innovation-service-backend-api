import { randText } from '@ngneat/falso';
import { InnovationSupportStatusEnum, NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import { TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { randomUUID } from 'crypto';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { supportSummaryUrl, threadUrl } from '../../_helpers/url.helper';
import { SupportStatusUpdateHandler } from './support-status-update.handler';

describe('Notifications / _handlers / support-status-update suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const recipients = [
    DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
    DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
  ];

  beforeAll(async () => {
    await new TestsHelper().init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;

  const message = randText();
  const threadId = randomUUID();

  const requestUser = scenario.users.aliceQualifyingAccessor;

  describe('ST01_SUPPORT_STATUS_TO_ENGAGING', () => {
    it('should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST01_SUPPORT_STATUS_TO_ENGAGING', {
        notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
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
          unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, threadId)
        }
      });
    });

    it('should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST01_SUPPORT_STATUS_TO_ENGAGING', {
        innovationId: innovation.id,
        context: { type: NotificationCategoryEnum.SUPPORT, id: support.id },
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
          unitName: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        }
      });
    });
  });

  describe('ST02_SUPPORT_STATUS_TO_OTHER', () => {
    describe.each([InnovationSupportStatusEnum.CLOSED, InnovationSupportStatusEnum.UNSUITABLE])(
      'when changing status to %s',
      supportStatus => {
        it('should send an email to the innovators', async () => {
          await testEmails(SupportStatusUpdateHandler, 'ST02_SUPPORT_STATUS_TO_OTHER', {
            notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
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
              unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              message: message,
              status: TranslationHelper.translate(`SUPPORT_STATUS.${supportStatus}`).toLowerCase(),
              support_summary_url: supportSummaryUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
            }
          });
        });

        it('should send an in-app to the innovators', async () => {
          await testInApps(SupportStatusUpdateHandler, 'ST02_SUPPORT_STATUS_TO_OTHER', {
            innovationId: innovation.id,
            context: { type: NotificationCategoryEnum.SUPPORT, id: support.id },
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
              unitName: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              status: TranslationHelper.translate(`SUPPORT_STATUS.${supportStatus}`).toLowerCase()
            }
          });
        });
      }
    );
  });

  describe('ST03_SUPPORT_STATUS_TO_WAITING', () => {
    it('should send an email to the innovators', async () => {
      await testEmails(SupportStatusUpdateHandler, 'ST03_SUPPORT_STATUS_TO_WAITING', {
        notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
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
          innovation_name: innovation.name,
          unit_name: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          message: message,
          support_summary_url: supportSummaryUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
        }
      });
    });

    it('should send an in-app to the innovators', async () => {
      await testInApps(SupportStatusUpdateHandler, 'ST03_SUPPORT_STATUS_TO_WAITING', {
        innovationId: innovation.id,
        context: { type: NotificationCategoryEnum.SUPPORT, id: support.id },
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
          unitName: requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          status: TranslationHelper.translate(`SUPPORT_STATUS.${InnovationSupportStatusEnum.WAITING}`).toLowerCase()
        }
      });
    });
  });
});
