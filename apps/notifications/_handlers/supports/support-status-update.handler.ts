import type { Context } from '@azure/functions';
import { InnovationSupportStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { supportSummaryUrl, surveysInitialPage, threadUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class SupportStatusUpdateHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_STATUS_UPDATE,
  | 'ST01_SUPPORT_STATUS_TO_ENGAGING'
  | 'ST02_SUPPORT_STATUS_TO_OTHER'
  | 'ST03_SUPPORT_STATUS_TO_WAITING'
  | 'ST09_SUPPORT_STATUS_TO_CLOSED'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    switch (this.inputData.support.status) {
      case InnovationSupportStatusEnum.ENGAGING:
        await this.ST01_SUPPORT_STATUS_TO_ENGAGING(innovation, recipients);
        break;
      case InnovationSupportStatusEnum.WAITING:
        await this.ST03_SUPPORT_STATUS_TO_WAITING(innovation, recipients);
        break;
      case InnovationSupportStatusEnum.UNSUITABLE:
        await this.ST02_SUPPORT_STATUS_TO_OTHER(innovation, recipients);
        break;
      case InnovationSupportStatusEnum.CLOSED:
        await this.ST09_SUPPORT_STATUS_TO_CLOSED(innovation, recipients);
        break;
    }

    return this;
  }

  private async getAccessorNames(): Promise<string[]> {
    const accessorsIdentityIds = await this.recipientsService.usersIds2IdentityIds(
      this.inputData.support.newAssignedAccessorsIds ?? []
    );
    const accessorsInfo = await this.recipientsService.usersIdentityInfo(Array.from(accessorsIdentityIds.values()));
    const accessorNames: string[] = [];
    accessorsInfo.forEach(a => accessorNames.push(a.displayName));
    return accessorNames;
  }

  private async ST01_SUPPORT_STATUS_TO_ENGAGING(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const accessorNames: string[] = await this.getAccessorNames();
    const unitName = this.getRequestUnitName();
    const notificationId = randomUUID();

    this.addEmails('ST01_SUPPORT_STATUS_TO_ENGAGING', recipients, {
      notificationPreferenceType: 'SUPPORT',
      params: {
        accessors_name: HandlersHelper.transformIntoBullet(accessorNames),
        innovation_name: innovation.name,
        message: this.inputData.support.message,
        unit_name: unitName,
        message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.threadId, notificationId)
      }
    });

    this.addInApp('ST01_SUPPORT_STATUS_TO_ENGAGING', recipients, {
      context: {
        type: 'SUPPORT',
        detail: 'ST01_SUPPORT_STATUS_TO_ENGAGING',
        id: this.inputData.support.id
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        threadId: this.inputData.threadId,
        unitName: unitName
      },
      notificationId
    });
  }

  private async ST02_SUPPORT_STATUS_TO_OTHER(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const unitName = this.getRequestUnitName();
    const notificationId = randomUUID();

    this.addEmails('ST02_SUPPORT_STATUS_TO_OTHER', recipients, {
      notificationPreferenceType: 'SUPPORT',
      params: {
        innovation_name: innovation.name,
        message: this.inputData.support.message,
        unit_name: unitName,
        status: this.translateSupportStatus(this.inputData.support.status),
        support_summary_url: supportSummaryUrl(
          ServiceRoleEnum.INNOVATOR,
          innovation.id,
          notificationId,
          this.requestUser.organisation?.organisationUnit?.id
        )
      }
    });

    this.addInApp('ST02_SUPPORT_STATUS_TO_OTHER', recipients, {
      context: {
        type: 'SUPPORT',
        detail: 'ST02_SUPPORT_STATUS_TO_OTHER',
        id: this.inputData.support.id
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        status: this.translateSupportStatus(this.inputData.support.status),
        unitId: this.requestUser.organisation?.organisationUnit?.id ?? '',
        unitName: unitName
      },
      notificationId
    });
  }

  private async ST03_SUPPORT_STATUS_TO_WAITING(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const unitName = this.getRequestUnitName();
    const accessorNames: string[] = await this.getAccessorNames();
    const notificationId = randomUUID();

    this.addEmails('ST03_SUPPORT_STATUS_TO_WAITING', recipients, {
      notificationPreferenceType: 'SUPPORT',
      params: {
        innovation_name: innovation.name,
        unit_name: unitName,
        message: this.inputData.support.message,
        support_summary_url: supportSummaryUrl(
          ServiceRoleEnum.INNOVATOR,
          innovation.id,
          notificationId,
          this.requestUser.organisation?.organisationUnit?.id
        ),
        accessors_name: HandlersHelper.transformIntoBullet(accessorNames)
      }
    });

    this.addInApp('ST03_SUPPORT_STATUS_TO_WAITING', recipients, {
      context: {
        type: 'SUPPORT',
        detail: 'ST03_SUPPORT_STATUS_TO_WAITING',
        id: this.inputData.support.id
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        status: this.translateSupportStatus(this.inputData.support.status),
        unitId: this.requestUser.organisation?.organisationUnit?.id ?? '',
        unitName: unitName
      },
      notificationId
    });
  }

  private async ST09_SUPPORT_STATUS_TO_CLOSED(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const unitName = this.getRequestUnitName();
    const notificationId = randomUUID();

    this.notify('ST09_SUPPORT_STATUS_TO_CLOSED', recipients, {
      email: {
        notificationPreferenceType: 'SUPPORT',
        params: {
          innovation_name: innovation.name,
          message: this.inputData.support.message,
          unit_name: unitName,
          start_survey_page: surveysInitialPage(ServiceRoleEnum.INNOVATOR, innovation.id, notificationId)
        }
      },
      inApp: {
        context: {
          type: 'SUPPORT',
          detail: 'ST09_SUPPORT_STATUS_TO_CLOSED',
          id: this.inputData.support.id
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          unitId: this.requestUser.organisation?.organisationUnit?.id ?? '',
          unitName: unitName
        },
        notificationId
      }
    });
  }

  private translateSupportStatus(supportStatus: InnovationSupportStatusEnum): string {
    return TranslationHelper.translate(`SUPPORT_STATUS.${supportStatus}`).toLowerCase();
  }
}
