import { InnovationSupportStatusEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { MocksHelper, type CompleteScenarioType } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { innovationOverviewUrl, supportStatusUrl, supportSummaryUrl, threadsUrl } from '../../_helpers/url.helper';
import { RecipientsService } from '../../_services/recipients.service';
import { NotificationsTestsHelper } from '../../_tests/notifications-test.helper';
import { IdleSupportAccessorHandler } from './idle-support-accessor.handler';

describe('Notifications / _handlers / idle support handler suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario: CompleteScenarioType = testsHelper.getCompleteScenario();

  const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

  beforeAll(async () => {
    await testsHelper.init();
  });

  jest.spyOn(RecipientsService.prototype, 'idleSupports').mockResolvedValue([
    {
      supportId: johnInnovation.supports.supportByHealthOrgUnit.id,
      supportStatus: johnInnovation.supports.supportByHealthOrgUnit.status,
      innovationId: johnInnovation.id,
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    },
    {
      supportId: johnInnovation.supports.supportByMedTechOrgUnit.id,
      supportStatus: InnovationSupportStatusEnum.WAITING, // This doesn't match the scenario but is to simplify this tests.
      innovationId: johnInnovation.id,
      unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
    }
  ]);

  jest.spyOn(RecipientsService.prototype, 'idleWaitingSupports').mockResolvedValue([
    {
      supportId: johnInnovation.supports.supportByHealthOrgUnit.id,
      innovationId: johnInnovation.id,
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    },
    {
      supportId: johnInnovation.supports.supportByMedTechOrgUnit.id,
      innovationId: johnInnovation.id,
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
            innovation_name: johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              johnInnovation.supports.supportByHealthOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        },
        {
          templateId: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
          params: {
            innovation_name: johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              johnInnovation.supports.supportByHealthOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        },
        {
          templateId: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.samAccessor),
          params: {
            innovation_name: johnInnovation.name,
            support_status_url: supportStatusUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              johnInnovation.supports.supportByMedTechOrgUnit.id
            ),
            support_summary_url: supportSummaryUrl(
              ServiceRoleEnum.ACCESSOR,
              johnInnovation.id,
              scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
            ),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByHealthOrgUnit.id
          },
          userRoleIds: [
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
          ],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByHealthOrgUnit.id,
            unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          }
        },
        {
          context: {
            detail: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByMedTechOrgUnit.id
          },
          userRoleIds: [scenario.users.samAccessor.roles.accessorRole.id],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByMedTechOrgUnit.id,
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
            innovation_name: johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        },
        {
          templateId: 'AU06_ACCESSOR_IDLE_WAITING',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
          params: {
            innovation_name: johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        },
        {
          templateId: 'AU06_ACCESSOR_IDLE_WAITING',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.samAccessor),
          params: {
            innovation_name: johnInnovation.name,
            innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id),
            thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU06_ACCESSOR_IDLE_WAITING',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByHealthOrgUnit.id
          },
          userRoleIds: [
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
          ],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByHealthOrgUnit.id
          }
        },
        {
          context: {
            detail: 'AU06_ACCESSOR_IDLE_WAITING',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByMedTechOrgUnit.id
          },
          userRoleIds: [scenario.users.samAccessor.roles.accessorRole.id],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByMedTechOrgUnit.id
          }
        }
      ]);
    });
  });

  describe('AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS', () => {
    it('should send notifications for each innovations supporting accessors', async () => {
      const handler = new IdleSupportAccessorHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      const emails = handler.emails.filter(e => e.templateId === 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS');
      const inApps = handler.inApp.filter(
        a => a.context.detail === 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS'
      );

      expect(emails).toStrictEqual([
        {
          templateId: 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
          params: {
            innovation_name: johnInnovation.name
          }
        },
        {
          templateId: 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
          params: {
            innovation_name: johnInnovation.name
          }
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByHealthOrgUnit.id
          },
          userRoleIds: [
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
            scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id
          ],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByHealthOrgUnit.id,
            unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
          }
        }
      ]);
    });
  });

  describe('AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS', () => {
    it('should send notifications for each innovations supporting accessors', async () => {
      const handler = new IdleSupportAccessorHandler({} as any, {}, MocksHelper.mockContext());
      await handler.run();

      const emails = handler.emails.filter(e => e.templateId === 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS');
      const inApps = handler.inApp.filter(a => a.context.detail === 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS');

      const johnInnovationParams = {
        innovation_name: johnInnovation.name,
        innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id),
        thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, johnInnovation.id)
      };
      expect(emails).toStrictEqual([
        {
          templateId: 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS',
          notificationPreferenceType: 'AUTOMATIC',
          to: DTOsHelper.getRecipientUser(scenario.users.samAccessor),
          params: johnInnovationParams
        }
      ]);

      expect(inApps).toStrictEqual([
        {
          context: {
            detail: 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS',
            type: 'AUTOMATIC',
            id: johnInnovation.supports.supportByMedTechOrgUnit.id
          },
          userRoleIds: [scenario.users.samAccessor.roles.accessorRole.id],
          innovationId: johnInnovation.id,
          params: {
            innovationName: johnInnovation.name,
            supportId: johnInnovation.supports.supportByMedTechOrgUnit.id
          }
        }
      ]);
    });
  });
});
