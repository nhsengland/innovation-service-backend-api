import type { Context } from '@azure/functions';
import { NotificationCategoryEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import type { RecipientType } from 'apps/notifications/_services/recipients.service';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { innovationOverviewUrl, threadUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class SupportNewAssignedAccessorsHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS,
  | 'ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR'
  | 'ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA'
  | 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const unitName = this.getRequestUnitName();

    // Joining recipients from added/removed QA/A
    const accessorsRecipients = await this.recipientsService.getRecipientsByRoleId([
      ...this.inputData.newAssignedAccessorsRoleIds,
      ...this.inputData.removedAssignedAccessorsRoleIds
    ]);

    await this.ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR(
      innovation,
      unitName,
      accessorsRecipients.map(r => r.identityId)
    );
    await this.ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA(innovation, accessorsRecipients);
    await this.ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA(innovation, accessorsRecipients);

    return this;
  }

  private async ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR(
    innovation: { id: string; name: string },
    unitName: string,
    accessorsIdentityIds: string[]
  ): Promise<void> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    const accessorsInfo = await this.recipientsService.usersIdentityInfo(accessorsIdentityIds);
    const accessorNames: string[] = [];
    accessorsInfo.forEach(a => accessorNames.push(a.displayName));

    this.addEmails('ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR', recipients, {
      notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
      params: {
        accessors_name: HandlersHelper.transformIntoBullet(accessorNames),
        innovation_name: innovation.name,
        message: this.inputData.message,
        unit_name: unitName,
        message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.threadId)
      }
    });

    this.addInApp('ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR', recipients, {
      context: {
        type: NotificationCategoryEnum.SUPPORT,
        detail: 'ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        threadId: this.inputData.threadId,
        unitName: unitName
      }
    });
  }

  private async ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const addedRecipients = recipients.filter(r => this.inputData.newAssignedAccessorsRoleIds.includes(r.roleId));
    const requestUserName = await this.getRequestUserName();

    this.addEmails('ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', addedRecipients, {
      notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
      params: {
        innovation_name: innovation.name,
        qa_name: requestUserName,
        innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
      }
    });

    this.addInApp('ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', addedRecipients, {
      context: {
        type: NotificationCategoryEnum.SUPPORT,
        detail: 'ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: { innovationName: innovation.name }
    });
  }

  private async ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const removedRecipients = recipients.filter(r => this.inputData.removedAssignedAccessorsRoleIds.includes(r.roleId));

    this.addEmails('ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', removedRecipients, {
      notificationPreferenceType: NotificationCategoryEnum.SUPPORT,
      params: { innovation_name: innovation.name }
    });

    this.addInApp('ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', removedRecipients, {
      context: {
        type: NotificationCategoryEnum.SUPPORT,
        detail: 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: { innovationName: innovation.name }
    });
  }
}
