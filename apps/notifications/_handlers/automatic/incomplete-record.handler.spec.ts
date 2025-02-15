import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationRecordUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IncompleteRecordHandler } from './incomplete-record.handler';
import * as crypto from 'crypto';

jest.mock('crypto');
const notificationId = '00001234-1234-1234-1234-123456789012';
jest.spyOn(crypto, 'randomUUID').mockImplementation(() => notificationId);

describe('Notifications / _handlers / incomplete record suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  jest.spyOn(RecipientsService.prototype, 'incompleteInnovations').mockResolvedValue([
    {
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name
    },
    {
      innovationId: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
      innovationName: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name
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
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
            )
          }
        },
        {
          templateId: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator),
          params: {
            innovation_record_url: innovationRecordUrl(
              ServiceRoleEnum.INNOVATOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              notificationId
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
              scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
              notificationId
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
          userRoleIds: [
            scenario.users.johnInnovator.roles.innovatorRole.id,
            scenario.users.janeInnovator.roles.innovatorRole.id
          ],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {},
          notificationId
        },
        {
          context: {
            detail: 'AU01_INNOVATOR_INCOMPLETE_RECORD',
            type: 'AUTOMATIC',
            id: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id
          },
          userRoleIds: [scenario.users.ottoOctaviusInnovator.roles.innovatorRole.id],
          innovationId: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
          params: {},
          notificationId
        }
      ]);
    });
  });
});
