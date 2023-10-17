/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IdleInnovatorsHandler } from './idle-innovators.handler';

import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { RecipientType, RecipientsService } from '../../_services/recipients.service';

describe('Notifications / _handlers / idle-innovators handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: IdleInnovatorsHandler;

  const recipients: Record<
    string,
    {
      recipient: RecipientType;
      innovationId: string;
      innovationName: string;
    }
  > = {};

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    recipients['john'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name
    };
    recipients['adam'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole'),
      innovationId: scenario.users.adamInnovator.innovations.adamInnovation.id,
      innovationName: scenario.users.adamInnovator.innovations.adamInnovation.name
    };

    jest
      .spyOn(RecipientsService.prototype, 'incompleteInnovationRecordOwners')
      .mockResolvedValueOnce([recipients['john']!, recipients['adam']!]);

    handler = new IdleInnovatorsHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {},
      MocksHelper.mockContext()
    );

    await handler.run();
  });

  it('Should email all idle innovators', () => {
    expect(handler.emails).toHaveLength(2);
    expect(handler.emails).toMatchObject([
      {
        templateId: 'INNOVATOR_INCOMPLETE_RECORD',
        to: recipients['john']?.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: recipients['john']?.innovationName
        }
      },
      {
        templateId: 'INNOVATOR_INCOMPLETE_RECORD',
        to: recipients['adam']?.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: recipients['adam']?.innovationName
        }
      }
    ]);
  });
});
