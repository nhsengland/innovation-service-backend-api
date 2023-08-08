import { UrlModel } from '@notifications/shared/models';
import { MocksHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';
import { InnovationRecordExportRequestHandler } from './innovation-record-export-request.handler';

describe('Notifications / _handlers / innovation-record-export-request handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
  const innovationOwner = scenario.users.johnInnovator;

  const request = innovation.exportRequests.requestByAlice;

  let handler: InnovationRecordExportRequestHandler;

  beforeAll(async () => {
    await testsHelper.init();
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });

    jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockResolvedValueOnce(request);
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));
    jest
      .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
      .mockResolvedValueOnce(DTOsHelper.getIdentityUserInfo(scenario.users.aliceQualifyingAccessor));
  });

  it('Should send email to innovation owner when request created by QA', async () => {
    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      { innovationId: innovation.id, requestId: request.id },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          unit_name: request.createdBy.unitName,
          accessor_name: scenario.users.aliceQualifyingAccessor.name,
          pdf_request_comment: request.requestReason,
          pdf_export_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/record/export-requests/:requestId')
            .setPathParams({ innovationId: innovation.id, requestId: request.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should send email to innovation owner when request created by NA', async () => {
    const requestByNa = innovation.exportRequests.requestByPaulPending;
    jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockReset().mockResolvedValueOnce(requestByNa);
    jest
      .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
      .mockReset()
      .mockResolvedValueOnce(DTOsHelper.getIdentityUserInfo(scenario.users.paulNeedsAssessor));

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor, 'assessmentRole'),
      { innovationId: innovation.id, requestId: requestByNa.id },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          unit_name: requestByNa.createdBy.unitName,
          accessor_name: scenario.users.paulNeedsAssessor.name,
          pdf_request_comment: requestByNa.requestReason,
          pdf_export_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/record/export-requests/:requestId')
            .setPathParams({ innovationId: innovation.id, requestId: requestByNa.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should correct request user name in email to innovation owner when request user info is not found', async () => {
    jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockReset().mockResolvedValueOnce(null);

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      { innovationId: innovation.id, requestId: request.id },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST_TO_INNOVATOR,
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          unit_name: request.createdBy.unitName,
          accessor_name: 'user',
          pdf_request_comment: request.requestReason,
          pdf_export_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/record/export-requests/:requestId')
            .setPathParams({ innovationId: innovation.id, requestId: request.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should not send email if innovation owner is not active', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockReset()
      .mockResolvedValueOnce({ ...DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'), isActive: false });

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      { innovationId: innovation.id, requestId: request.id },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
  });
});
