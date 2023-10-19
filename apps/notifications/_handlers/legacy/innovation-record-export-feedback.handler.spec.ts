import { InnovationExportRequestStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { InnovationRecordExportFeedbackHandler } from './innovation-record-export-feedback.handler';

describe('Notifications / _handlers / innovation-record-export-feedback handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const innovationOwner = scenario.users.johnInnovator;

  const requestByAlice = innovation.exportRequests.requestByAlice;
  const requestByPaul = innovation.exportRequests.requestByPaulPending;

  let handler: InnovationRecordExportFeedbackHandler;

  beforeAll(async () => {
    await testsHelper.init();
  });

  describe.each([
    [
      InnovationExportRequestStatusEnum.APPROVED,
      'INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR',
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      requestByAlice
    ],
    [
      InnovationExportRequestStatusEnum.REJECTED,
      'INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR',
      DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      requestByAlice
    ],
    [
      InnovationExportRequestStatusEnum.APPROVED,
      'INNOVATION_RECORD_EXPORT_APPROVED_TO_REQUEST_CREATOR',
      DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
      requestByPaul
    ],
    [
      InnovationExportRequestStatusEnum.REJECTED,
      'INNOVATION_RECORD_EXPORT_REJECTED_TO_REQUEST_CREATOR',
      DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
      requestByPaul
    ]
  ])('Innovation record export %s', (status, templateId, recipient, request) => {
    beforeEach(() => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock export request info
      jest
        .spyOn(RecipientsService.prototype, 'getExportRequestInfo')
        .mockResolvedValueOnce({ ...request, status: status });
    });

    it('Should send email to the user who created the request', async () => {
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(recipient);

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        { innovationId: innovation.id, requestId: request.id },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId,
          to: recipient,
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovator_name: innovationOwner.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':userBasePath/innovations/:innovationId/record')
              .setPathParams({
                userBasePath: recipient.role === ServiceRoleEnum.ASSESSMENT ? 'assessment' : 'accessor',
                innovationId: innovation.id
              })
              .buildUrl(),
            pdf_rejection_comment: request.rejectReason
          }
        }
      ]);
    });

    it('Should correct innovation owner name in email to request creatorn when innovation owner info is not found', async () => {
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(recipient);
      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        { innovationId: innovation.id, requestId: request.id },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId,
          to: recipient,
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovator_name: 'user',
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':userBasePath/innovations/:innovationId/record')
              .setPathParams({
                userBasePath: recipient.role === ServiceRoleEnum.ASSESSMENT ? 'assessment' : 'accessor',
                innovationId: innovation.id
              })
              .buildUrl(),
            pdf_rejection_comment: request.rejectReason
          }
        }
      ]);
    });

    it('Should not send email to request creator if he is not active', async () => {
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce({
        ...recipient,
        isActive: false
      });

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        { innovationId: innovation.id, requestId: request.id },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(0);
    });
  });
});
