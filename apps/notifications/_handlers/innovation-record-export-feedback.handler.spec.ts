import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { InnovationRecordExportFeedbackHandler } from './innovation-record-export-feedback.handler';
import { InnovationExportRequestStatusEnum } from '@notifications/shared/enums';
import { RecipientsService } from '../_services/recipients.service';
import { ENV, EmailTypeEnum } from '../_config';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { UrlModel } from '@notifications/shared/models';

describe('Notifications / _handlers / innovation-record-export-feedback handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let request: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['exportRequests']['requestByAlice'];

  let handler: InnovationRecordExportFeedbackHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    request = innovation.exportRequests.requestByAlice;
  });

  describe.each([
    [InnovationExportRequestStatusEnum.APPROVED, EmailTypeEnum.INNOVATION_RECORD_EXPORT_APPROVED_TO_ACCESSOR],
    [InnovationExportRequestStatusEnum.REJECTED, EmailTypeEnum.INNOVATION_RECORD_EXPORT_REJECTED_TO_ACCESSOR]
  ])('Innovation record export %s', (status: InnovationExportRequestStatusEnum, templateId: EmailTypeEnum) => {
    beforeEach(() => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock export request info
      jest
        .spyOn(RecipientsService.prototype, 'getExportRequestInfo')
        .mockResolvedValueOnce({ ...request, status: status });
    });

    it('Should send email to accessor who created the request', async () => {
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'));

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          requestId: request.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId,
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovator_name: innovationOwner.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('accessor/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl(),
            pdf_rejection_comment: request.rejectReason
          }
        }
      ]);
    });

    it('Should correct innovation owner name in email to accessor when innovation owner info is not found', async () => {
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'));

      jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          requestId: request.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toMatchObject([
        {
          templateId,
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovator_name: 'user',
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('accessor/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl(),
            pdf_rejection_comment: request.rejectReason
          }
        }
      ]);
    });

    it('Should not send email to accessor if accessor is not active', async () => {
      jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce({
        ...DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        isActive: false
      });

      handler = new InnovationRecordExportFeedbackHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id,
          requestId: request.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(0);
    });
  });
});