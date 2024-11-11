import * as crypto from 'crypto';
import { ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { supportSummaryUrl } from '../../_helpers/url.helper';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { SupportSummaryUpdateHandler } from './support-summary-update.handler';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / support-summary-update suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovatorRecipients = [
    DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
    DTOsHelper.getRecipientUser(scenario.users.janeInnovator)
  ];
  const assignedAccessorsRecipients = [DTOsHelper.getRecipientUser(scenario.users.samAccessor)];

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const support = innovation.supports.supportByHealthOrgUnit;

  const requestUser = scenario.users.aliceQualifyingAccessor;
  const requestUserUnit = requestUser.organisations.healthOrg.organisationUnits.healthOrgUnit;

  describe('SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS', () => {
    it('should send an email to the innovators when a QA/A creates a progress update from support summary', async () => {
      await testEmails(SupportSummaryUpdateHandler, 'SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, supportId: support.id },
        recipients: innovatorRecipients,
        outputData: {
          innovation_name: innovation.name,
          unit_name: requestUserUnit.name,
          support_summary_update_url: supportSummaryUrl(
            ServiceRoleEnum.INNOVATOR,
            innovation.id,
            notificationId,
            requestUserUnit.id
          )
        }
      });
    });

    it('should send an in-app to the innovators when a QA/A creates a progress update from support summary', async () => {
      await testInApps(SupportSummaryUpdateHandler, 'SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, supportId: support.id },
        recipients: innovatorRecipients,
        outputData: {
          innovationName: innovation.name,
          unitName: requestUserUnit.name,
          unitId: requestUserUnit.id
        },
        notificationId
      });
    });
  });

  describe('SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS', () => {
    it('should send an email to the other assigned QA/A when a QA/A from other unit updates support summary', async () => {
      await testEmails(SupportSummaryUpdateHandler, 'SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS', {
        notificationPreferenceType: 'SUPPORT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, supportId: support.id },
        recipients: assignedAccessorsRecipients,
        outputData: {
          innovation_name: innovation.name,
          unit_name: requestUserUnit.name,
          support_summary_update_url: supportSummaryUrl(
            ServiceRoleEnum.ACCESSOR,
            innovation.id,
            notificationId,
            requestUserUnit.id
          )
        }
      });
    });

    it('should send an in-app to the other assigned QA/A when a QA/A from other unit updates support summary', async () => {
      await testInApps(SupportSummaryUpdateHandler, 'SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS', {
        innovationId: innovation.id,
        context: { type: 'SUPPORT', id: support.id },
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        inputData: { innovationId: innovation.id, supportId: support.id },
        recipients: assignedAccessorsRecipients,
        outputData: { innovationName: innovation.name, unitName: requestUserUnit.name, unitId: requestUserUnit.id },
        notificationId
      });
    });
  });
});
