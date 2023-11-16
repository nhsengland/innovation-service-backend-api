import { randText } from '@ngneat/falso';
import { InnovationExportRequestStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { testEmails, testInApps } from '../../../_helpers/tests.helper';
import { innovationRecordUrl } from '../../../_helpers/url.helper';
import { RecipientsService } from '../../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../../_tests/notifications-test.helper';
import { ExportRequestFeedbackHandler } from './export-request-feedback.handler';

describe('Notifications / _handlers / export-request-feedback suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const exportRequest = innovation.exportRequests.requestByAlice;
  const requestUser = scenario.users.johnInnovator;

  describe('RE02_EXPORT_REQUEST_APPROVED', () => {
    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockResolvedValue({
        ...exportRequest,
        status: InnovationExportRequestStatusEnum.APPROVED
      });
    });

    it('should send an email to the user who requested the export request', async () => {
      await testEmails(ExportRequestFeedbackHandler, 'RE02_EXPORT_REQUEST_APPROVED', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        inputData: { innovationId: innovation.id, exportRequestId: exportRequest.id },
        outputData: {
          innovator_name: requestUser.name,
          innovation_name: innovation.name,
          innovation_record_url: innovationRecordUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
        }
      });
    });
    it('should send an in-app to the user who requested the export request', async () => {
      await testInApps(ExportRequestFeedbackHandler, 'RE02_EXPORT_REQUEST_APPROVED', {
        context: { type: 'INNOVATION_MANAGEMENT', id: exportRequest.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        inputData: { innovationId: innovation.id, exportRequestId: exportRequest.id },
        outputData: { innovationName: innovation.name, exportRequestId: exportRequest.id }
      });
    });
  });

  describe('RE03_EXPORT_REQUEST_REJECTED', () => {
    const rejectReason = randText();

    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockResolvedValue({
        ...exportRequest,
        status: InnovationExportRequestStatusEnum.REJECTED,
        rejectReason
      });
    });

    it('should send an email to the user who requested the export request', async () => {
      await testEmails(ExportRequestFeedbackHandler, 'RE03_EXPORT_REQUEST_REJECTED', {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        inputData: { innovationId: innovation.id, exportRequestId: exportRequest.id },
        outputData: {
          innovator_name: requestUser.name,
          innovation_name: innovation.name,
          reject_comment: rejectReason
        }
      });
    });
    it('should send an in-app to the user who requested the export request', async () => {
      await testInApps(ExportRequestFeedbackHandler, 'RE03_EXPORT_REQUEST_REJECTED', {
        context: { type: 'INNOVATION_MANAGEMENT', id: exportRequest.id },
        innovationId: innovation.id,
        requestUser: DTOsHelper.getUserRequestContext(requestUser),
        recipients: [DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)],
        inputData: { innovationId: innovation.id, exportRequestId: exportRequest.id },
        outputData: { innovationName: innovation.name, exportRequestId: exportRequest.id }
      });
    });
  });
});
