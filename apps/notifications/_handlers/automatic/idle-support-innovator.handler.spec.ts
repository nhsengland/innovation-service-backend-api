import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { howToProceedUrl, innovationRecordUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IdleSupportInnovatorHandler } from './idle-support-innovator.handler';
import * as crypto from 'crypto';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

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
      const handler = new IdleSupportInnovatorHandler({} as any, {}, MocksHelper.mockContext());
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
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
            ),
            how_to_proceed_page_url: howToProceedUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
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
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
            ),
            how_to_proceed_page_url: howToProceedUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
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
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
              notificationId
            ),
            how_to_proceed_page_url: howToProceedUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
              notificationId
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
          },
          notificationId
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
          },
          notificationId
        }
      ]);
    });
  });
});
