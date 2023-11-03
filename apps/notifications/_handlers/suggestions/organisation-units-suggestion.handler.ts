import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { dataSharingPreferencesUrl, innovationOverviewUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class OrganisationUnitsSuggestionHandler extends BaseHandler<
  NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION,
  'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA' | 'OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    const sharedOrgs = await this.recipientsService.innovationSharedOrganisationsWithUnits(this.inputData.innovationId);
    const sharedUnitsIds = sharedOrgs.flatMap(o => o.organisationUnits.map(u => u.id));
    const suggestedSharedUnitsIds = sharedUnitsIds.filter(id => this.inputData.unitsIds.includes(id));
    const suggestedSharedUnitsUsers =
      await this.recipientsService.organisationUnitsQualifyingAccessors(suggestedSharedUnitsIds);

    if (this.inputData.unitsIds.some(id => !sharedUnitsIds.includes(id))) {
      await this.OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR(innovation);
    }

    if (this.inputData.unitsIds.some(id => sharedUnitsIds.includes(id))) {
      await this.OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA(innovation, suggestedSharedUnitsUsers);
    }

    return this;
  }

  private async OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const unitName = this.getRequestUnitName();
    const senderTag = HandlersHelper.getNotificationDisplayTag(this.requestUser.currentRole.role, {
      unitName: this.requestUser.organisation?.organisationUnit?.name
    });

    this.notify('OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA', recipients, {
      email: {
        notificationPreferenceType: NotificationCategoryEnum.SUGGEST_SUPPORT,
        params: {
          innovation_name: innovation.name,
          comment: this.inputData.comment,
          organisation_unit: unitName,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id),
          showKPI: 'yes'
        }
      },
      inApp: {
        context: {
          type: NotificationCategoryEnum.SUGGEST_SUPPORT,
          detail: 'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA',
          id: this.inputData.innovationId
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name, senderDisplayInformation: senderTag }
      }
    });

    // // In case KPI becomes Optional
    // const innovationSupportsMap = new Map(
    //   (await this.recipientsService.getInnovationSupports(innovation.id)).map(s => [s.unitId, s])
    // );

    // const params = {
    //   innovation_name: innovation.name,
    //   comment: this.inputData.comment,
    //   organisation_unit: unitName,
    //   innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
    // };

    // // Show KPI information for units that haven't started a support
    // this.addEmails(
    //   'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA',
    //   recipients.filter(r => !innovationSupportsMap.has(r.unitId!)),
    //   {
    //     notificationPreferenceType: NotificationCategoryEnum.SUGGEST_SUPPORT,
    //     params: { ...params, showKPI: 'yes' }
    //   }
    // );

    // // Don't show KPIs information when the unit is already supporting
    // this.addEmails(
    //   'OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA',
    //   recipients.filter(r => innovationSupportsMap.has(r.unitId!)),
    //   {
    //     notificationPreferenceType: NotificationCategoryEnum.SUGGEST_SUPPORT,
    //     params: { ...params, showKPI: 'no' }
    //   }
    // );
  }

  private async OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR(innovation: { id: string; name: string }): Promise<void> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    this.addEmails('OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR', recipients, {
      notificationPreferenceType: NotificationCategoryEnum.SUGGEST_SUPPORT,
      params: {
        innovation_name: innovation.name,
        data_sharing_preferences_url: dataSharingPreferencesUrl(ServiceRoleEnum.INNOVATOR, innovation.id)
      }
    });

    this.addInApp('OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR', recipients, {
      context: {
        type: NotificationCategoryEnum.SUGGEST_SUPPORT,
        detail: 'OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR',
        id: this.inputData.innovationId
      },
      innovationId: innovation.id,
      params: {}
    });
  }
}
