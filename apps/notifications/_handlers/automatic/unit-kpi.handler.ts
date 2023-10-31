import type { NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { ENV } from '../../_config';

import type { Context } from '@azure/functions';
import { UrlModel } from '@notifications/shared/models';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

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
    const reminderInnovations = await this.recipientsService.suggestedInnovationsWithoutUnitAction(4);
    const overdueInnovations = await this.recipientsService.suggestedInnovationsWithoutUnitAction(6, 7);

    await this.sendNotifications(reminderInnovations, 'AU04_SUPPORT_KPI_REMINDER');
    await this.sendNotifications(overdueInnovations, 'AU05_SUPPORT_KPI_OVERDUE');

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
      const qas = this.unitQAs.get(unitId)!;

      for (const innovation of innovations) {
        // TODO fix here

        // send email
        for (const recipient of qas) {
          this.emails.push({
            templateId: templateId,
            to: recipient,
            notificationPreferenceType: null, // CHANGE THIS
            params: {
              innovation_name: innovation.name,
              innovation_overview_url: new UrlModel(ENV.webBaseTransactionalUrl)
                .addPath('accessor/innovations/:innovationId/overview')
                .setPathParams({
                  innovationId: innovation.id
                })
                .buildUrl()
            }
          });
        }

        /* inApp is delayed until we merge this into develop
        this.inApp.push({
          context: {
            detail: templateId as any,
            id: innovation.id,
            type: 'AUTOMATIC' as any
          },
          innovationId: innovation.id,
          userRoleIds: qas.map(x => x.roleId),
          params: {
            innovationName: innovation.name
          }
        });
        */
      }
    }
  }
}
