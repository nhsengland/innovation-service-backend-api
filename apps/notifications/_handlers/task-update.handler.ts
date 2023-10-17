import {
  InnovationTaskStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import { EmailErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import type { IdentityProviderService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';

import type { Context } from '@azure/functions';
import type { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import type { RecipientType } from '../_services/recipients.service';
import { BaseHandler } from './base.handler';

export class TaskUpdateHandler extends BaseHandler<
  NotifierTypeEnum.TASK_UPDATE,
  | EmailTypeEnum.TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS
  | EmailTypeEnum.TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT
  | EmailTypeEnum.TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT
  | EmailTypeEnum.TA05_TASK_CANCELLED_TO_INNOVATOR
  | EmailTypeEnum.TA06_TASK_REOPEN_TO_INNOVATOR,
  {
    taskCode: string;
    taskStatus: '' | InnovationTaskStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
  }
> {
  private identityProviderService = container.get<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService);

  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovationInfo = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const owner = await this.recipientsService.getUsersRecipient(innovationInfo.ownerId, ServiceRoleEnum.INNOVATOR);

    const taskInfo = await this.recipientsService.taskInfoWithOwner(this.inputData.task.id);

    const innovation = { id: this.inputData.innovationId, name: innovationInfo.name, owner: owner };

    const task = {
      ...taskInfo,
      status: this.inputData.task.status, // we want here the status provided when triggering the notification
      section: this.inputData.task.section
    };

    switch (this.requestUser.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        if ([InnovationTaskStatusEnum.DONE, InnovationTaskStatusEnum.DECLINED].includes(this.inputData.task.status)) {
          await this.prepareEmailForAccessorOrAssessment(innovation, task);
          await this.prepareInAppForAccessorOrAssessment(task);

          // if task was submitted or declined by a collaborator notify owner
          if (innovation.owner && this.requestUser.currentRole.id !== innovation.owner.roleId) {
            await this.prepareInAppForInnovationOwner({ id: innovation.id, owner: innovation.owner }, task);
            await this.prepareEmailForInnovationOwnerFromCollaborator(
              { id: innovation.id, owner: innovation.owner },
              task
            );
          }
        }
        break;
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
      case ServiceRoleEnum.ASSESSMENT:
        if ([InnovationTaskStatusEnum.OPEN, InnovationTaskStatusEnum.CANCELLED].includes(this.inputData.task.status)) {
          if (innovation.owner) {
            await this.prepareEmailForInnovationOwner({ id: innovation.id, owner: innovation.owner }, task);
            await this.prepareInAppForInnovationOwner({ id: innovation.id, owner: innovation.owner }, task);
          }
          // check if task was submitted by a collaborator
          if (
            this.inputData.task.previouslyUpdatedByUserRole &&
            this.inputData.task.previouslyUpdatedByUserRole.id !== innovation.owner?.roleId &&
            this.inputData.task.previouslyUpdatedByUserRole.role === ServiceRoleEnum.INNOVATOR
          ) {
            await this.prepareInAppForCollaborator({
              ...task,
              previouslyUpdatedByUserRole: this.inputData.task.previouslyUpdatedByUserRole
            });
          }
        }
        break;

      default:
        break;
    }

    return this;
  }

  // Private methods.

  private async prepareEmailForAccessorOrAssessment(
    innovation: { id: string; name: string },
    task: { id: string; status: InnovationTaskStatusEnum; owner: RecipientType }
  ): Promise<void> {
    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    let templateId: EmailTypeEnum;
    switch (task.status) {
      case InnovationTaskStatusEnum.DONE:
        templateId = EmailTypeEnum.TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT;
        break;
      case InnovationTaskStatusEnum.DECLINED:
        templateId = EmailTypeEnum.TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const path =
      task.owner.role === ServiceRoleEnum.ASSESSMENT
        ? 'assessment/innovations/:innovationId/tasks/:taskId'
        : 'accessor/innovations/:innovationId/tasks/:taskId';

    this.emails.push({
      templateId: templateId,
      to: task.owner,
      notificationPreferenceType: 'TASK',
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovator_name: requestInfo.displayName,
        innovation_name: innovation.name,
        ...(templateId === EmailTypeEnum.TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT && {
          declined_TASK_reason: this.inputData.comment ?? ''
        }),
        message_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath(path)
          .setPathParams({
            innovationId: innovation.id,
            taskId: task.id
          })
          .buildUrl()
      } as any // TODO
    });
  }

  private async prepareEmailForInnovationOwner(
    innovation: { id: string; owner: RecipientType },
    task: { id: string; status: InnovationTaskStatusEnum; owner: RecipientType }
  ): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (task.status) {
      case InnovationTaskStatusEnum.OPEN:
        templateId = EmailTypeEnum.TA06_TASK_REOPEN_TO_INNOVATOR;
        break;
      case InnovationTaskStatusEnum.CANCELLED:
        templateId = EmailTypeEnum.TA05_TASK_CANCELLED_TO_INNOVATOR;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    const accessor_name = requestInfo.displayName;
    const unit_name =
      this.requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
        ? 'needs assessment'
        : this.requestUser.organisation?.organisationUnit?.name ?? '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'TASK',
      to: innovation.owner,
      params: {
        accessor_name: accessor_name,
        unit_name: unit_name,
        message_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/tasks/:taskId')
          .setPathParams({
            innovationId: innovation.id,
            taskId: task.id
          })
          .buildUrl()
      } as any // TODO
    });
  }

  private async prepareEmailForInnovationOwnerFromCollaborator(
    innovation: { id: string; owner: RecipientType },
    task: { id: string; status: InnovationTaskStatusEnum; owner: RecipientType; organisationUnit?: { name: string } }
  ): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (task.status) {
      case InnovationTaskStatusEnum.DONE:
      case InnovationTaskStatusEnum.DECLINED:
        templateId = EmailTypeEnum.TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const requestInfo = await this.identityProviderService.getUserInfo(this.requestUser.identityId);

    const taskOwnerInfo = await this.recipientsService.usersIdentityInfo(task.owner.identityId);
    const taskOwnerUnitName =
      task.owner.role === ServiceRoleEnum.ASSESSMENT ? 'needs assessment' : task.organisationUnit?.name || '';

    this.emails.push({
      templateId,
      notificationPreferenceType: 'TASK',
      to: innovation.owner,
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        collaborator_name: requestInfo.displayName,
        accessor_name: taskOwnerInfo?.displayName ?? 'user', // Review what should happen if user is not found
        unit_name: taskOwnerUnitName,
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('innovator/innovations/:innovationId/tasks/:taskId')
          .setPathParams({
            innovationId: innovation.id,
            taskId: task.id
          })
          .buildUrl()
      } as any // TODO
    });
  }

  private async prepareInAppForAccessorOrAssessment(task: {
    id: string;
    status: InnovationTaskStatusEnum;
    displayId: string;
    section: CurrentCatalogTypes.InnovationSections;
    owner: RecipientType;
  }): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.TASK,
        detail: NotificationContextDetailEnum.TASK_UPDATE,
        id: task.id
      },
      userRoleIds: [task.owner.roleId],
      params: {
        taskCode: task.displayId,
        taskStatus: task.status, // We use here the supplied task status, NOT the task status from query.
        section: task.section
      }
    });
  }

  private async prepareInAppForInnovationOwner(
    innovation: { id: string; owner: RecipientType },
    task: {
      id: string;
      status: InnovationTaskStatusEnum;
      displayId: string;
      section: CurrentCatalogTypes.InnovationSections;
    }
  ): Promise<void> {
    this.inApp.push({
      innovationId: innovation.id,
      context: {
        type: NotificationContextTypeEnum.TASK,
        detail: NotificationContextDetailEnum.TASK_UPDATE,
        id: task.id
      },
      userRoleIds: [innovation.owner.roleId],
      params: {
        taskCode: task.displayId,
        taskStatus: task.status, // We use here the supplied task status, NOT the task status from query.
        section: task.section
      }
    });
  }

  private async prepareInAppForCollaborator(task: {
    id: string;
    status: InnovationTaskStatusEnum;
    displayId: string;
    section: CurrentCatalogTypes.InnovationSections;
    previouslyUpdatedByUserRole: { id: string };
  }): Promise<void> {
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.TASK,
        detail: NotificationContextDetailEnum.TASK_UPDATE,
        id: this.inputData.task.id
      },
      userRoleIds: [task.previouslyUpdatedByUserRole.id],
      params: {
        taskCode: task.displayId,
        taskStatus: task.status, // We use here the supplied task status, NOT the task status from query.
        section: task.section
      }
    });
  }
}
