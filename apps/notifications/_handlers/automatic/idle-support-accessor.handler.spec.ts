import { ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationOverviewUrl, supportStatusUrl, supportSummaryUrl, threadsUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IdleSupportAccessorHandler } from './idle-support-accessor.handler';

describe('Notifications / _handlers / idle support handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  jest.spyOn(RecipientsService.prototype, 'idleEngagingSupports').mockResolvedValue([
    {
      supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id,
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    },
    {
      supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id,
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
    }
  ]);

  jest.spyOn(RecipientsService.prototype, 'idleWaitingSupports').mockResolvedValue([
    {
      supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id,
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    },
    {
      supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id,
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
    }
  ]);

  describe('AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT', () => {
    it('should send notifications for each innovations supporting accessors', async () => {
      const handler = new IdleSupportAccessorHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      const emails = handler.emails.filter(e => e.templateId === 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT');
      const inApps = handler.inApp.filter(a => a.context.detail === 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT');

      expect(emails).toStrictEqual([
        {
          templateId: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        },
        {
          templateId: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        },
        {
          templateId: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.samAccessor),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id,
              scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id
          },
          userRoleIds: [
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
          ],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {
            innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
            supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id,
            unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          }
        },
        {
          context: {
            detail: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id
          },
          userRoleIds: [scenario.users.samAccessor.roles.accessorRole.id],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {
            innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
            supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id,
            unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
          }
        }
      ]);
    });
  });

  describe('AU06_ACCESSOR_IDLE_WAITING', () => {
    it('should send notifications for each innovations supporting accessors', async () => {
      const handler = new IdleSupportAccessorHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      const emails = handler.emails.filter(e => e.templateId === 'AU06_ACCESSOR_IDLE_WAITING');
      const inApps = handler.inApp.filter(a => a.context.detail === 'AU06_ACCESSOR_IDLE_WAITING');

      expect(emails).toStrictEqual([
        {
          templateId: 'AU06_ACCESSOR_IDLE_WAITING',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        },
        {
          templateId: 'AU06_ACCESSOR_IDLE_WAITING',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        },
        {
          templateId: 'AU06_ACCESSOR_IDLE_WAITING',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.samAccessor),
          params: {
            innovation_name: scenario.users.johnInnovator.innovations.johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(
              ServiceRoleEnum.ACCESSOR,
              scenario.users.johnInnovator.innovations.johnInnovation.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, scenario.users.johnInnovator.innovations.johnInnovation.id)
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU06_ACCESSOR_IDLE_WAITING',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id
          },
          userRoleIds: [
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
          ],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {
            innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
            supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id
          }
        },
        {
          context: {
            detail: 'AU06_ACCESSOR_IDLE_WAITING',
            type: 'AUTOMATIC',
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id
          },
          userRoleIds: [scenario.users.samAccessor.roles.accessorRole.id],
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          params: {
            innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
            supportId: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByMedTechOrgUnit.id
          }
        }
      ]);
    });
  });
});
