import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { InnovationRecordExportRequestHandler } from './innovation-record-export-request.handler';
import { RecipientsService } from '../_services/recipients.service';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';

describe('Notifications / _handlers / innovation-record-export-request handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let request: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['exportRequests']['requestByAlice'];

  let handler: InnovationRecordExportRequestHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    request = innovation.exportRequests.requestByAlice;
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });


    jest.spyOn(RecipientsService.prototype, 'getExportRequestInfo').mockResolvedValueOnce(request);
  });

  it('Should send email to innovation owner', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'))
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'));

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      {
        innovationId: innovation.id,
        requestId: request.id
      },
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
            .addPath('innovator/innovations/:innovationId/export/list')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should correct accessor name in email to innovation owner when accessor info is not found', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'))
      .mockResolvedValueOnce(null);

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      {
        innovationId: innovation.id,
        requestId: request.id
      },
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
            .addPath('innovator/innovations/:innovationId/export/list')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should not send email if innovation owner is not active', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce({ ...DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'), isActive: false })
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'));

    handler = new InnovationRecordExportRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor, 'qaRole'),
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
