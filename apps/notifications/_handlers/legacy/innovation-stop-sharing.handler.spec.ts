import { randText } from '@ngneat/falso';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { InnovationStopSharingHandler } from './innovation-stop-sharing.handler';

describe('Notifications / _handlers / innovation-stop-sharing handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationStopSharingHandler;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });
  });

  it('Should send email to the innovation owner', async () => {
    jest.spyOn(RecipientsService.prototype, 'usersBagToRecipients').mockResolvedValueOnce([]);

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

    const message = randText({ charCount: 10 });

    handler = new InnovationStopSharingHandler(
      DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
      {
        innovationId: innovation.id,
        previousAssignedAccessors: [],
        message: message
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    const expectedEmail = handler.emails.find(email => email.templateId === 'INNOVATION_STOP_SHARING_TO_INNOVATOR');

    expect(expectedEmail).toMatchObject({
      templateId: 'INNOVATION_STOP_SHARING_TO_INNOVATOR',
      to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
      notificationPreferenceType: null,
      params: {
        innovation_name: innovation.name,
        innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId')
          .setPathParams({
            innovationId: innovation.id
          })
          .buildUrl()
      }
    });
  });

  it('Should not send email to the innovation owner if innovation owner is not active', async () => {
    jest.spyOn(RecipientsService.prototype, 'usersBagToRecipients').mockResolvedValueOnce([]);

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce({ ...DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'), isActive: false });

    const message = randText({ charCount: 10 });

    handler = new InnovationStopSharingHandler(
      DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
      {
        innovationId: innovation.id,
        previousAssignedAccessors: [],
        message: message
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    const expectedEmail = handler.emails.find(email => email.templateId === 'INNOVATION_STOP_SHARING_TO_INNOVATOR');

    expect(expectedEmail).toBeUndefined();
  });

  it('Should send email to assigned accessors', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'usersBagToRecipients')
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

    const message = randText({ charCount: 10 });

    handler = new InnovationStopSharingHandler(
      DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
      {
        innovationId: innovation.id,
        previousAssignedAccessors: [],
        message: message
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    const expectedEmail = handler.emails.find(
      email => email.templateId === 'INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS'
    );

    expect(expectedEmail).toMatchObject({
      templateId: 'INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS',
      notificationPreferenceType: null,
      to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      params: {
        innovation_name: innovation.name,
        innovator_name: innovationOwner.name,
        stop_sharing_comment: message
      }
    });
  });

  it('Should correct innovation owner name in email to assigned accessors if innovation owner info is not found', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'usersBagToRecipients')
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

    jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

    const message = randText({ charCount: 10 });

    handler = new InnovationStopSharingHandler(
      DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
      {
        innovationId: innovation.id,
        previousAssignedAccessors: [],
        message: message
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    const expectedEmail = handler.emails.find(
      email => email.templateId === 'INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS'
    );

    expect(expectedEmail).toMatchObject({
      templateId: 'INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS',
      notificationPreferenceType: null,
      to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      params: {
        innovation_name: innovation.name,
        innovator_name: 'user',
        stop_sharing_comment: message
      }
    });
  });

  it('Should not send any email if the request user is not an innovator', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'usersBagToRecipients')
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);

    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

    const message = randText({ charCount: 10 });

    handler = new InnovationStopSharingHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {
        innovationId: innovation.id,
        previousAssignedAccessors: [],
        message: message
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
  });
});
