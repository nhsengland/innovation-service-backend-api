import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { InnovationTransferOwnershipReminderHandler } from './innovation-transfer-ownership-reminder.handler';
import { IdentityProviderService } from '@notifications/shared/services';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { UrlModel } from '@notifications/shared/models';

describe('Notifications / _handlers / innovation-transfer-ownership-reminder handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationTransferOwnershipReminderHandler;

  let innovation: CompleteScenarioType['users']['adamInnovator']['innovations']['adamInnovation'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.adamInnovator.innovations.adamInnovation;
  });

  it('Should send email to target user that already exists in the service', async () => {
    jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce({
      identityId: scenario.users.janeInnovator.identityId,
      displayName: scenario.users.janeInnovator.name,
      email: scenario.users.janeInnovator.email,
      phone: null
    });

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'));

    handler = new InnovationTransferOwnershipReminderHandler(
      DTOsHelper.getUserRequestContext(scenario.users.adamInnovator, 'innovatorRole'),
      {
        innovationId: innovation.id,
        innovationName: innovation.name,
        transferId: innovation.transfer.id,
        recipientEmail: innovation.transfer.email
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_EXISTING_USER,
        to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/dashboard').buildUrl()
        }
      }
    ]);
  });

  it('Should send email to target user outside the service', async () => {
    jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockResolvedValueOnce(null);

    handler = new InnovationTransferOwnershipReminderHandler(
      DTOsHelper.getUserRequestContext(scenario.users.adamInnovator, 'innovatorRole'),
      {
        innovationId: innovation.id,
        innovationName: innovation.name,
        transferId: innovation.transfer.id,
        recipientEmail: innovation.transfer.email
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.INNOVATION_TRANSFER_REMINDER_NEW_USER,
        to: { email: innovation.transfer.email },
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          transfer_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(`transfers/${innovation.transfer.id}`)
            .buildUrl()
        }
      }
    ]);
  });
});
