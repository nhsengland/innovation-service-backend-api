import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class UnitKPIHandler extends BaseHandler<
  NotifierTypeEnum.UNIT_KPI,
  'AU04_SUPPORT_KPI_REMINDER' | 'AU05_SUPPORT_KPI_OVERDUE'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.UNIT_KPI],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  private unitQAs: Map<string, RecipientType[]> = new Map<string, RecipientType[]>();

  async run(): Promise<this> {
    const date = new Date();
    const dayOfWeek = date.getDay();

    // Run only on weekdays
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const reminderInnovations = await this.recipientsService.suggestedInnovationsWithoutUnitAction(4);
      const overdueInnovations = await this.recipientsService.suggestedInnovationsWithoutUnitAction(6, true);

      await this.sendNotifications(reminderInnovations, 'AU04_SUPPORT_KPI_REMINDER');
      await this.sendNotifications(overdueInnovations, 'AU05_SUPPORT_KPI_OVERDUE');
    }

    return this;
  }

  private async sendNotifications(
    map: Map<string, { id: string; name: string }[]>,
    templateId: 'AU04_SUPPORT_KPI_REMINDER' | 'AU05_SUPPORT_KPI_OVERDUE'
  ): Promise<void> {
    // Resolve unit QAs
    for (const [unitId, innovations] of map) {
      if (!this.unitQAs.has(unitId)) {
        this.unitQAs.set(unitId, await this.recipientsService.organisationUnitsQualifyingAccessors([unitId]));
      }
      const qas = this.unitQAs.get(unitId) ?? [];

      for (const innovation of innovations) {
        const notificationId = randomUUID();

        this.notify(templateId, qas, {
          email: {
            templateId: templateId,
            notificationPreferenceType: 'AUTOMATIC',
            params: {
              innovation_name: innovation.name,
              innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId)
            }
          },
          inApp: {
            innovationId: innovation.id,
            context: {
              type: 'AUTOMATIC',
              id: innovation.id,
              detail: templateId
            },
            params: {
              innovationName: innovation.name
            },
            notificationId
          }
        });
      }
    }
  }
}
