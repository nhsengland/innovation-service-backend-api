import { randText } from '@ngneat/falso';
import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { randomUUID } from 'crypto';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { testEmails, testInApps } from '../../_helpers/tests.helper';
import { exportRequestUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { ExportRequestSubmittedHandler } from './export-request-submitted.handler';

describe('Notifications / _handlers / innovation-submitted suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const exportRequest = { id: randomUUID(), comment: randText() };
  const requestUser = scenario.users.aliceQualifyingAccessor;
  const displayTag = HandlersHelper.getNotificationDisplayTag(requestUser.roles.qaRole.role, {
    unitName: requestUser.roles.qaRole.organisationUnit?.name
  });

  describe('RE01_EXPORT_REQUEST_SUBMITTED', () => {
    it('should send an email to the innovation owner', async () => {
      await testEmails(ExportRequestSubmittedHandler, 'RE01_EXPORT_REQUEST_SUBMITTED', {
        notificationPreferenceType: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          exportRequestId: exportRequest.id,
          comment: exportRequest.comment
        },
        outputData: {
          innovation_name: innovation.name,
          comment: exportRequest.comment,
          sender: `${requestUser.name} (${displayTag})`,
          request_url: exportRequestUrl(ServiceRoleEnum.INNOVATOR, innovation.id, exportRequest.id)
        }
      });
    });

    it('should send an in-app to the innovation owner', async () => {
      await testInApps(ExportRequestSubmittedHandler, 'RE01_EXPORT_REQUEST_SUBMITTED', {
        context: {
          type: NotificationCategoryEnum.INNOVATION_MANAGEMENT,
          id: exportRequest.id
        },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.johnInnovator)],
        inputData: {
          innovationId: innovation.id,
          exportRequestId: exportRequest.id,
          comment: exportRequest.comment
        },
        outputData: {
          innovationName: innovation.name,
          unitName: displayTag,
          exportRequestId: exportRequest.id
        }
      });
    });

    it("should send email or inapps if innovation doesn't have a owner", async () => {
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValue({
        id: innovation.id,
        name: innovation.name
      });

      const handler = new ExportRequestSubmittedHandler(
        DTOsHelper.getUserRequestContext(requestUser),
        {
          innovationId: innovation.id,
          exportRequestId: exportRequest.id,
          comment: exportRequest.comment
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(0);
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
