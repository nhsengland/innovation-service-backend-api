import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';

export class InnovationArchiveHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_ARCHIVE,
  | 'AI01_INNOVATION_ARCHIVED_TO_SELF'
  | 'AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS'
  | 'AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A'
  | 'AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ARCHIVE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    // Always send a "receipt" to the owner
    if (innovation.ownerId) {
      await this.AI01_INNOVATION_ARCHIVED_TO_SELF(innovation);
    }

    // // Send the email for the assigned NA or QA/A
    // if (this.inputData.affectedUsers.length > 0) {
    //   await this.SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS(innovation);
    // }

    return this;
  }

  //   private async SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS(innovation: {
  //     id: string;
  //     name: string;
  //   }): Promise<void> {
  //     const recipients = await this.recipientsService.usersBagToRecipients(
  //       this.inputData.affectedUsers.map(u => ({
  //         id: u.id,
  //         userType: u.role,
  //         organisationUnit: u.unitId
  //       }))
  //     );
  //     const requestUserName = await this.getRequestUserName();

  //     this.notify('SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS', recipients, {
  //       email: {
  //         notificationPreferenceType: 'INNOVATION_MANAGEMENT',
  //         params: {
  //           innovation_name: innovation.name,
  //           innovator_name: requestUserName,
  //           comment: this.inputData.message
  //         }
  //       },
  //       inApp: {
  //         context: {
  //           id: innovation.id,
  //           type: 'INNOVATION_MANAGEMENT',
  //           detail: 'SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS'
  //         },
  //         innovationId: innovation.id,
  //         params: { innovationName: innovation.name }
  //       }
  //     });
  //   }

  private async AI01_INNOVATION_ARCHIVED_TO_SELF(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    if (!owner) {
      return;
    }

    this.notify('AI01_INNOVATION_ARCHIVED_TO_SELF', [owner], {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name
        },
        options: { includeSelf: true }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'AI01_INNOVATION_ARCHIVED_TO_SELF'
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name },
        options: { includeSelf: true }
      }
    });
  }

  private asyn AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
        this.inputData.innovationId
      )
  }
}
