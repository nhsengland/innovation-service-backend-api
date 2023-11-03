import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationRecordUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IdleSupportHandler } from './idle-support.handler';

describe('Notifications / _handlers / idle support handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  jest.spyOn(RecipientsService.prototype, 'innovationsWithoutSupportForNDays').mockResolvedValue([
    {
      id: scenario.users.johnInnovator.innovations.johnInnovation.id,
      name: scenario.users.johnInnovator.innovations.johnInnovation.name
    },
    {
      id: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
      name: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name
    }
  ]);

  describe('AU03_INNOVATOR_IDLE_SUPPORT', () => {
    it('should send notifications for each idle innovation', async () => {
      const handler = new IdleSupportHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      expect(handler.emails).toStrictEqual([
        {
          templateId: 'AU03_INNOVATOR_IDLE_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            ),
            how_to_proceed_page_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            )
          }
        },
        {
          templateId: 'AU03_INNOVATOR_IDLE_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            ),
            how_to_proceed_page_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            )
          }
        },
        {
          templateId: 'AU03_INNOVATOR_IDLE_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.ottoOctaviusInnovator),
          params: {
            innovation_name: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name,
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
            ),
            how_to_proceed_page_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
            )
          }
        }
      ]);

      expect(handler.inApp).toStrictEqual([
        {
          context: {
            detail: 'AU03_INNOVATOR_IDLE_SUPPORT',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.id
          },
          userRoleIds: [
            scenario.users.johnInnovator.roles.innovatorRole.id,
            scenario.users.janeInnovator.roles.innovatorRole.id
          ],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {
            innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name
          }
        },
        {
          context: {
            detail: 'AU03_INNOVATOR_IDLE_SUPPORT',
            type: 'AUTOMATIC',
            id: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
          },
          userRoleIds: [scenario.users.ottoOctaviusInnovator.roles.innovatorRole.id],
          innovationId: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
          params: {
            innovationName: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name
          }
        }
      ]);
    });
  });
});
