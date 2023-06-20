/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DailyDigestHandler } from './daily-digest.handler';

import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { RecipientType, RecipientsService } from '../_services/recipients.service';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { randNumber } from '@ngneat/falso';
import { EmailTypeEnum } from '../_config';

describe('Notifications / _handlers / daily-digest handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: DailyDigestHandler;

  const recipients: Record<
    string,
    {
      recipient: RecipientType;
      actionsCount: number;
      messagesCount: number;
      supportsCount: number;
    }
  > = {};

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    recipients['john'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
      actionsCount: randNumber(),
      messagesCount: randNumber(),
      supportsCount: randNumber()
    };

    recipients['alice'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      actionsCount: randNumber(),
      messagesCount: randNumber(),
      supportsCount: randNumber()
    };
  });

  beforeEach(async () => {
    // mock daily digest recipients
    jest
      .spyOn(RecipientsService.prototype, 'dailyDigestUsersWithCounts')
      .mockResolvedValueOnce([recipients['john']!, recipients['alice']!]);

    handler = new DailyDigestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {},
      MocksHelper.mockContext()
    );

    await handler.run();
  });

  it('Should send email to all daily digest innovator recipients', () => {
    const johnEmail = handler.emails.find(email => email.templateId === EmailTypeEnum.INNOVATOR_DAILY_DIGEST);

    expect(johnEmail).toMatchObject({
      templateId: EmailTypeEnum.INNOVATOR_DAILY_DIGEST,
      to: recipients['john']?.recipient,
      notificationPreferenceType: null,
      params: {
        messages_count: recipients['john']?.messagesCount.toString(),
        actions_count: recipients['john']?.actionsCount.toString(),
        supports_count: recipients['john']?.supportsCount.toString()
      }
    });
  });

  it('Should send email to all daily digest accessor recipients', () => {
    const aliceEmail = handler.emails.find(email => email.templateId === EmailTypeEnum.ACCESSOR_DAILY_DIGEST);

    expect(aliceEmail).toMatchObject({
      templateId: EmailTypeEnum.ACCESSOR_DAILY_DIGEST,
      to: recipients['alice']?.recipient,
      notificationPreferenceType: null,
      params: {
        messages_count: recipients['alice']?.messagesCount.toString(),
        actions_count: recipients['alice']?.actionsCount.toString(),
        supports_count: recipients['alice']?.supportsCount.toString()
      }
    });
  });
});
