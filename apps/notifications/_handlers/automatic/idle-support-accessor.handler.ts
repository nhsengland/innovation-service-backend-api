import type { Context } from '@azure/functions';
import { WEEK_IN_DAYS } from '@notifications/shared/constants';
import { InnovationSupportStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import { groupBy } from '@notifications/shared/helpers/misc.helper';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl, supportStatusUrl, supportSummaryUrl, threadsUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import type { RecipientType } from '../../_services/recipients.service';
import { randomUUID } from 'crypto';

export class IdleSupportAccessorHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR,
  | 'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT'
  | 'AU06_ACCESSOR_IDLE_WAITING'
  | 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS'
  | 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS'
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
    await this.handleIdleNotifications();
    return this;
  }

  private async AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT(): Promise<void> {
    const idleSupports = await this.recipientsService.idleSupports(90, [InnovationSupportStatusEnum.ENGAGING], 30);
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
        const notificationId = randomUUID();

        this.notify('AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT', recipients, {
          email: {
            notificationPreferenceType: 'AUTOMATIC',
            params: {
              innovation_name: innovation.name,
              support_status_url: supportStatusUrl(
                ServiceRoleEnum.ACCESSOR,
                innovationId,
                support.supportId,
                notificationId
              ),
              support_summary_url: supportSummaryUrl(ServiceRoleEnum.ACCESSOR, innovationId, support.unitId),
              thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, innovationId, notificationId)
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
            },
            notificationId
          }
        });
      }
    }
  }

  private async AU06_ACCESSOR_IDLE_WAITING(): Promise<void> {
    const idleSupports = await this.recipientsService.idleWaitingSupports(90, 30);
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
        const notificationId = randomUUID();

        this.notify('AU06_ACCESSOR_IDLE_WAITING', recipients, {
          email: {
            notificationPreferenceType: 'AUTOMATIC',
            params: {
              innovation_name: innovation.name,
              innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovationId, notificationId),
              thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, innovationId, notificationId)
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
            },
            notificationId
          }
        });
      }
    }
  }

  // Wrapper that reduces the amount of calls to DB to populate the AU10 and AU11.
  private async handleIdleNotifications(): Promise<void> {
    const idleSupports = await this.recipientsService.idleSupports(6 * WEEK_IN_DAYS, [
      InnovationSupportStatusEnum.ENGAGING,
      InnovationSupportStatusEnum.WAITING
    ]);
    const idleInnovationsMap = groupBy(idleSupports, 'innovationId');
    const innovationsInfo = await this.recipientsService.getInnovationsInfo([...idleInnovationsMap.keys()]);

    for (const [innovationId, supports] of idleInnovationsMap) {
      const innovation = innovationsInfo.get(innovationId);
      if (!innovation) continue;

      for (const support of supports) {
        const recipients = await this.recipientsService.innovationAssignedRecipients(innovationId, {
          unitId: support.unitId
        });
        if (support.supportStatus === InnovationSupportStatusEnum.ENGAGING) {
          await this.AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS(recipients, innovation, support);
        } else if (support.supportStatus === InnovationSupportStatusEnum.WAITING) {
          await this.AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS(recipients, innovation, support);
        }
      }
    }
  }

  private async AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS(
    recipients: RecipientType[],
    innovation: { id: string; name: string; ownerId?: string },
    support: { innovationId: string; unitId: string; supportId: string; supportStatus: InnovationSupportStatusEnum }
  ): Promise<void> {
    const notificationId = randomUUID();

    this.notify('AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS', recipients, {
      email: { notificationPreferenceType: 'AUTOMATIC', params: { innovation_name: innovation.name } },
      inApp: {
        context: {
          detail: 'AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS',
          id: support.supportId,
          type: 'AUTOMATIC'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          supportId: support.supportId,
          unitId: support.unitId
        },
        notificationId
      }
    });
  }

  private async AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS(
    recipients: RecipientType[],
    innovation: { id: string; name: string; ownerId?: string },
    support: { innovationId: string; unitId: string; supportId: string; supportStatus: InnovationSupportStatusEnum }
  ): Promise<void> {
    const notificationId = randomUUID();

    this.notify('AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS', recipients, {
      email: {
        notificationPreferenceType: 'AUTOMATIC',
        params: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId),
          thread_url: threadsUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId)
        }
      },
      inApp: {
        context: {
          detail: 'AU11_ACCESSOR_IDLE_WAITING_SUPPORT_FOR_SIX_WEEKS',
          id: support.supportId,
          type: 'AUTOMATIC'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          supportId: support.supportId
        },
        notificationId
      }
    });
  }
}
