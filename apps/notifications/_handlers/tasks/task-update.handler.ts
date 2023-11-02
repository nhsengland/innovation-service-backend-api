import {
  InnovationTaskStatusEnum,
  NotificationCategoryEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import {
  isInnovatorDomainContextType,
  type DomainContextType,
  type NotifierTemplatesType
} from '@notifications/shared/types';

import type { Context } from '@azure/functions';
import { assessmentUrl, threadUrl } from '../../_helpers/url.helper';
import type { RecipientType } from '../../_services/recipients.service';
import { BaseHandler } from '../base.handler';

export class TaskUpdateHandler extends BaseHandler<
  NotifierTypeEnum.TASK_UPDATE,
  | 'TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS'
  | 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT'
  | 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT'
  | 'TA05_TASK_CANCELLED_TO_INNOVATOR'
  | 'TA06_TASK_REOPEN_TO_INNOVATOR'
> {
  //private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovationInfo = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const innovatorRecipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    if (isInnovatorDomainContextType(this.requestUser)) {
      await this.TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS(innovationInfo, innovatorRecipients); // TODO fix
      const taskCreator = (await this.recipientsService.taskInfoWithOwner(this.inputData.task.id)).owner;

      switch (this.inputData.task.status) {
        case InnovationTaskStatusEnum.DONE:
          await this.TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT(innovationInfo, taskCreator);
          break;
        case InnovationTaskStatusEnum.DECLINED:
          await this.TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT(innovationInfo, taskCreator);
          break;
        default:
        // do nothing (innovators should not be able to cancel or reopen tasks)
      }
    } else {
      switch (this.inputData.task.status) {
        case InnovationTaskStatusEnum.CANCELLED:
          await this.TA05_TASK_CANCELLED_TO_INNOVATOR(innovationInfo, innovatorRecipients);
          break;
        case InnovationTaskStatusEnum.OPEN:
          await this.TA06_TASK_REOPEN_TO_INNOVATOR(innovationInfo, innovatorRecipients);
          break;
        default:
        // do nothing (accessors/assessors should not be able to respond to tasks)
      }
    }

    return this;
  }

  private async TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS(
    innovation: { id: string; name: string },
    innovators: RecipientType[]
  ): Promise<void> {
    this.addEmails('TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', innovators, {
      notificationPreferenceType: NotificationCategoryEnum.TASK,
      params: {
        innovation_name: innovation.name,
        innovator_name: await this.getRequestUserName(),
        task_status: this.translateStatus(this.inputData.task.status),
        message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.threadId)
      }
    });

    this.addInApp('TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS', innovators, {
      context: {
        type: NotificationCategoryEnum.TASK,
        detail: 'TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS',
        id: this.inputData.task.id
      },
      innovationId: this.inputData.innovationId,
      params: {
        requestUserName: await this.getRequestUserName(),
        innovationName: innovation.name,
        status: this.inputData.task.status,
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });
  }

  private async TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT(
    innovation: { id: string; name: string },
    recipient: RecipientType
  ): Promise<void> {
    this.addEmails('TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', [recipient], {
      notificationPreferenceType: NotificationCategoryEnum.TASK,
      params: {
        innovation_name: innovation.name,
        innovator_name: await this.getRequestUserName(),
        message: this.inputData.message,
        message_url: threadUrl(recipient.role, innovation.id, this.inputData.threadId),
        task_url: assessmentUrl(recipient.role, innovation.id, this.inputData.task.id)
      }
    });

    this.addInApp('TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT', [recipient], {
      context: {
        type: NotificationCategoryEnum.TASK,
        detail: 'TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT',
        id: this.inputData.task.id
      },
      innovationId: this.inputData.innovationId,
      params: {
        requestUserName: await this.getRequestUserName(),
        innovationName: innovation.name,
        status: this.inputData.task.status,
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });
  }

  private async TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT(
    innovation: { id: string; name: string },
    recipient: RecipientType
  ): Promise<void> {
    this.addEmails('TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', [recipient], {
      notificationPreferenceType: NotificationCategoryEnum.TASK,
      params: {
        innovation_name: innovation.name,
        innovator_name: await this.getRequestUserName(),
        message: this.inputData.message,
        message_url: threadUrl(recipient.role, innovation.id, this.inputData.threadId)
      }
    });

    this.addInApp('TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT', [recipient], {
      context: {
        type: NotificationCategoryEnum.TASK,
        detail: 'TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT',
        id: this.inputData.task.id
      },
      innovationId: this.inputData.innovationId,
      params: {
        requestUserName: await this.getRequestUserName(),
        innovationName: innovation.name,
        status: this.inputData.task.status,
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });
  }

  private async TA05_TASK_CANCELLED_TO_INNOVATOR(
    innovation: { id: string; name: string },
    innovators: RecipientType[]
  ): Promise<void> {
    this.addEmails('TA05_TASK_CANCELLED_TO_INNOVATOR', innovators, {
      notificationPreferenceType: NotificationCategoryEnum.TASK,
      params: {
        accessor_name: await this.getRequestUserName(),
        unit_name: this.getRequestUnitName(),
        innovation_name: innovation.name,
        message: this.inputData.message,
        message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.threadId)
      }
    });

    this.addInApp('TA05_TASK_CANCELLED_TO_INNOVATOR', innovators, {
      context: {
        type: NotificationCategoryEnum.TASK,
        detail: 'TA05_TASK_CANCELLED_TO_INNOVATOR',
        id: this.inputData.task.id
      },
      innovationId: this.inputData.innovationId,
      params: {
        requestUserName: await this.getRequestUserName(),
        innovationName: innovation.name,
        unitName: this.getRequestUnitName(),
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });
  }

  private async TA06_TASK_REOPEN_TO_INNOVATOR(
    innovation: { id: string; name: string },
    innovators: RecipientType[]
  ): Promise<void> {
    this.addEmails('TA06_TASK_REOPEN_TO_INNOVATOR', innovators, {
      notificationPreferenceType: NotificationCategoryEnum.TASK,
      params: {
        accessor_name: await this.getRequestUserName(),
        unit_name: this.getRequestUnitName(),
        innovation_name: innovation.name,
        message: this.inputData.message,
        message_url: threadUrl(ServiceRoleEnum.INNOVATOR, innovation.id, this.inputData.threadId)
      }
    });

    this.addInApp('TA06_TASK_REOPEN_TO_INNOVATOR', innovators, {
      context: {
        type: NotificationCategoryEnum.TASK,
        detail: 'TA06_TASK_REOPEN_TO_INNOVATOR',
        id: this.inputData.task.id
      },
      innovationId: this.inputData.innovationId,
      params: {
        requestUserName: await this.getRequestUserName(),
        innovationName: innovation.name,
        unitName: this.getRequestUnitName(),
        messageId: this.inputData.messageId,
        threadId: this.inputData.threadId
      }
    });
  }

  private translateStatus(status: InnovationTaskStatusEnum): string {
    switch (status) {
      case InnovationTaskStatusEnum.CANCELLED:
        return 'cancelled';
      case InnovationTaskStatusEnum.DONE:
        return 'done';
      case InnovationTaskStatusEnum.DECLINED:
        return 'declined';
      case InnovationTaskStatusEnum.OPEN:
        return 'reopened';
      default: {
        const x: never = status;
        throw new Error(`Status ${x} not supported`); // this will never happen
      }
    }
  }
}
