import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationRecordUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IncompleteRecordHandler } from './incomplete-record.handler';

describe('Notifications / _handlers / incomplete record suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  jest.spyOn(RecipientsService.prototype, 'incompleteInnovationRecordOwners').mockResolvedValue([
    {
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
      recipient: DTOsHelper.getRecipientUser(scenario.users.johnInnovator)
    },
    {
      innovationId: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
      innovationName: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name,
      recipient: DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator)
    }
  ]);

  describe('AU01_INNOVATOR_INCOMPLETE_RECORD', () => {
    it('should send notifications for each incomplete innovation', async () => {
      const handler = new IncompleteRecordHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      expect(handler.emails).toStrictEqual([
        {
          templateId: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          params: {
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            )
          }
        },
        {
          templateId: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator),
          params: {
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
            )
          }
        }
      ]);

      expect(handler.inApp).toStrictEqual([
        {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {}
        },
        {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: 'AUTOMATIC',
            id: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
          },
          userRoleIds: [scenario.users.ottoOctaviusInnovator.roles.innovatorRole.id],
          innovationId: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
          params: {}
        }
      ]);
    });
  });
});
