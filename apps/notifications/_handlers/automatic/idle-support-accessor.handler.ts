import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import { groupBy } from '@notifications/shared/helpers/misc.helper';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl, supportStatusUrl, supportSummaryUrl, threadsUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class IdleSupportAccessorHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR,
  'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT' | 'AU06_ACCESSOR_IDLE_WAITING'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT();
    await this.AU06_ACCESSOR_IDLE_WAITING();

    return this;
  }

  private async AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT(): Promise<void> {
    const idleSupports = await this.recipientsService.idleEngagingSupports(90, 30);
    const idleInnovationsMap = groupBy(idleSupports, 'innovationId');
    const innovationsInfo = await this.recipientsService.getInnovationsInfo([...idleInnovationsMap.keys()]);
    for (const [innovationId, supports] of idleInnovationsMap) {
      const innovation = innovationsInfo.get(innovationId);
      if (!innovation) {
        continue;
      }

      for (const support of supports) {
        const recipients = await this.recipientsService.innovationAssignedRecipients(innovationId, {
          unitId: support.unitId
        });

        this.notify('AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT', recipients, {
          email: {
            notificationPreferenceType: 'AUTOMATIC',
            params: {
              innovation_name: innovation.name,
              support_status_url: supportStatusUrl(ServiceRoleEnum.ACCESSOR, innovationId, support.supportId),
              support_summary_url: supportSummaryUrl(ServiceRoleEnum.ACCESSOR, innovationId, support.unitId),
              thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, innovationId)
            }
          },
          inApp: {
            context: {
              detail: 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT',
              id: support.supportId,
              type: 'AUTOMATIC'
            },
            innovationId,
            params: {
              innovationName: innovation.name,
              supportId: support.supportId,
              unitId: support.unitId
            }
          }
        });
      }
    }
  }

  private async AU06_ACCESSOR_IDLE_WAITING(): Promise<void> {
    const idleSupports = await this.recipientsService.idleWaitingSupports(90);
    const idleInnovationsMap = groupBy(idleSupports, 'innovationId');
    const innovationsInfo = await this.recipientsService.getInnovationsInfo([...idleInnovationsMap.keys()]);
    for (const [innovationId, supports] of idleInnovationsMap) {
      const innovation = innovationsInfo.get(innovationId);
      if (!innovation) {
        continue;
      }

      for (const support of supports) {
        const recipients = await this.recipientsService.innovationAssignedRecipients(innovationId, {
          unitId: support.unitId
        });

        this.notify('AU06_ACCESSOR_IDLE_WAITING', recipients, {
          email: {
            notificationPreferenceType: 'AUTOMATIC',
            params: {
              innovation_name: innovation.name,
              innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovationId),
              thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, innovationId)
            }
          },
          inApp: {
            context: {
              detail: 'AU06_ACCESSOR_IDLE_WAITING',
              id: support.supportId,
              type: 'AUTOMATIC'
            },
            innovationId,
            params: {
              innovationName: innovation.name,
              supportId: support.supportId
            }
          }
        });
      }
    }
  }
}
