import { NotificationCategoryEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { UnitKPIHandler } from './unit-kpi.handler';

describe('Notifications / _handlers / organisation unit kpi suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const suggestedMock = jest.spyOn(RecipientsService.prototype, 'suggestedInnovationsWithoutUnitAction');
  const unitQAMock = jest.spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors');

  beforeEach(() => {
    suggestedMock.mockClear().mockResolvedValue(
      new Map([
        ['unit1', [{ id: 'innovation1', name: 'Innovation 1' }]],
        [
          'unit2',
          [
            { id: 'innovation1', name: 'Innovation 1' },
            { id: 'innovation2', name: 'Innovation 2' }
          ]
        ]
      ])
    );
    unitQAMock
      .mockClear()
      // Unit 1
      .mockResolvedValueOnce([
        DTOsHelper.getRecipientUser(scenario.users.ingridAccessor),
        DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor)
      ])
      // Unit 2
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)]);
  });

  describe.each(['AU04_SUPPORT_KPI_REMINDER', 'AU05_SUPPORT_KPI_OVERDUE'])('%s', template => {
    it('should send notifications for each unit/innovation ', async () => {
      const handler = new UnitKPIHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      const emails = handler.emails.filter(e => e.templateId === template);
      const inApps = handler.inApp.filter(e => e.context.detail === template);

      expect(emails).toStrictEqual([
        {
          templateId: template,
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          to: DTOsHelper.getRecipientUser(scenario.users.ingridAccessor),
          params: {
            innovation_name: 'Innovation 1',
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, 'innovation1')
          }
        },
        {
          templateId: template,
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          to: DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor),
          params: {
            innovation_name: 'Innovation 1',
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, 'innovation1')
          }
        },
        {
          templateId: template,
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
          params: {
            innovation_name: 'Innovation 1',
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, 'innovation1')
          }
        },
        {
          templateId: template,
          notificationPreferenceType: NotificationCategoryEnum.AUTOMATIC,
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
          params: {
            innovation_name: 'Innovation 2',
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, 'innovation2')
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          innovationId: 'innovation1',
          userRoleIds: [
            scenario.users.ingridAccessor.roles.accessorRole.id,
            scenario.users.bartQualifyingAccessor.roles.qaRole.id
          ],
          context: {
            type: NotificationCategoryEnum.AUTOMATIC,
            id: 'innovation1',
            detail: template
          },
          params: {
            innovationName: 'Innovation 1'
          }
        },
        {
          innovationId: 'innovation1',
          userRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
          context: {
            type: NotificationCategoryEnum.AUTOMATIC,
            id: 'innovation1',
            detail: template
          },
          params: {
            innovationName: 'Innovation 1'
          }
        },
        {
          innovationId: 'innovation2',
          userRoleIds: [scenario.users.aliceQualifyingAccessor.roles.qaRole.id],
          context: {
            type: NotificationCategoryEnum.AUTOMATIC,
            id: 'innovation2',
            detail: template
          },
          params: {
            innovationName: 'Innovation 2'
          }
        }
      ]);
    });
  });
});
