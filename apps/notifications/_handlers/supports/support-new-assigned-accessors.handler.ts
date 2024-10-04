import type { Context } from '@azure/functions';
import { InnovationSupportStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { HandlersHelper } from '../../_helpers/handlers.helper';
import { innovationOverviewUrl, threadUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class SupportNewAssignedAccessorsHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS,
  | 'ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR'
  | 'ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA'
  | 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA'
  | 'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA'
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

    // Joining recipients from added/removed QA/A
    const accessorsRecipients = await this.recipientsService.getRecipientsByRoleId([
      ...this.inputData.newAssignedAccessorsRoleIds,
      ...this.inputData.removedAssignedAccessorsRoleIds
    ]);

    if (this.inputData.newAssignedAccessorsRoleIds.length > 0) {
      const unitName = this.getRequestUnitName();

      const support = (await this.recipientsService.getInnovationSupports(this.inputData.innovationId)).find(
        s => s.id === this.inputData.supportId
      );

      //Only sends this notification if the status is not being changed (only changing accessors)
      if (!this.inputData.changedStatus) {
        await this.ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR(
          innovation,
          unitName,
          accessorsRecipients
            .filter(r => this.inputData.newAssignedAccessorsRoleIds.includes(r.roleId))
            .map(r => r.identityId)
        );
      }
      if (support?.status === InnovationSupportStatusEnum.ENGAGING) {
        await this.ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA(innovation, accessorsRecipients);
      } else if (support?.status === InnovationSupportStatusEnum.WAITING) {
        await this.ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA(innovation, accessorsRecipients);
      }
    }

    if (this.inputData.removedAssignedAccessorsRoleIds.length > 0) {
      await this.ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA(innovation, accessorsRecipients);
    }

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
      notificationPreferenceType: 'SUPPORT',
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
        type: 'SUPPORT',
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
      notificationPreferenceType: 'SUPPORT',
      params: {
        innovation_name: innovation.name,
        qa_name: requestUserName,
        innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
      }
    });

    this.addInApp('ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA', addedRecipients, {
      context: {
        type: 'SUPPORT',
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
      notificationPreferenceType: 'SUPPORT',
      params: { innovation_name: innovation.name }
    });

    this.addInApp('ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA', removedRecipients, {
      context: {
        type: 'SUPPORT',
        detail: 'ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: { innovationName: innovation.name }
    });
  }

  private async ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA(
    innovation: { id: string; name: string },
    recipients: RecipientType[]
  ): Promise<void> {
    const requestUserName = await this.getRequestUserName();
    const addedRecipients = recipients.filter(r => this.inputData.newAssignedAccessorsRoleIds.includes(r.roleId));

    this.notify('ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA', addedRecipients, {
      email: {
        notificationPreferenceType: 'SUPPORT',
        params: {
          innovation_name: innovation.name,
          qa_name: requestUserName
        }
      },
      inApp: {
        context: {
          type: 'SUPPORT',
          detail: 'ST08_SUPPORT_NEW_ASSIGNED_WAITING_INNOVATION_TO_QA',
          id: this.inputData.supportId
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name }
      }
    });
  }
}
