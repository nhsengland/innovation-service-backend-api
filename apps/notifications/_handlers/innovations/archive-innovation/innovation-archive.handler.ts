import type { Context } from '@azure/functions';
import { ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../../_helpers/url.helper';
import { BaseHandler } from '../../base.handler';
import { randomUUID } from 'crypto';

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
    await this.AI01_INNOVATION_ARCHIVED_TO_SELF(innovation);

    // Send notifications to collaborators
    await this.AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS(innovation);

    // Send notifications to QA/A
    if (this.inputData.affectedUsers.length > 0) {
      await this.AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A(innovation);
    }

    // Send notifications to NA if innovation is waiting assessment/reassessment
    await this.AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT(innovation);

    return this;
  }

  private async AI01_INNOVATION_ARCHIVED_TO_SELF(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);

    if (!owner) {
      return;
    }

    const notificationId = randomUUID();

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
        options: { includeSelf: true },
        notificationId
      }
    });
  }

  private async AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);

    if (!collaborators.length) {
      return;
    }

    const recipients = await this.recipientsService.getUsersRecipient(collaborators, ServiceRoleEnum.INNOVATOR);
    const notificationId = randomUUID();

    this.notify('AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS', recipients, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name
        }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS'
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name },
        notificationId
      }
    });
  }

  private async AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const recipients = await this.recipientsService.usersBagToRecipients(
      this.inputData.affectedUsers
        .map(u => ({
          id: u.userId,
          userType: u.userType,
          organisationUnit: u.unitId
        }))
        .filter(u => [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR].includes(u.userType))
    );
    const notificationId = randomUUID();

    this.notify('AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A', recipients, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          archived_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId)
        }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          archivedUrl: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id, notificationId)
        },
        notificationId
      }
    });
  }

  private async AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT(innovation: {
    id: string;
    name: string;
    ownerId?: string;
  }): Promise<void> {
    const previousAssessor = await this.recipientsService.usersBagToRecipients(
      this.inputData.affectedUsers
        .map(u => ({
          id: u.userId,
          userType: u.userType
        }))
        .filter(u => u.userType === ServiceRoleEnum.ASSESSMENT)
    );

    if (!previousAssessor.length) {
      return;
    }

    const notificationId = randomUUID();

    this.notify('AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', previousAssessor, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          assessment_type: this.inputData.reassessment ? 'reassessment' : 'assessment'
        }
      },
      inApp: {
        context: {
          id: innovation.id,
          type: 'INNOVATION_MANAGEMENT',
          detail: 'AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          assessmentType: this.inputData.reassessment ? 'reassessment' : 'assessment'
        },
        notificationId
      }
    });
  }
}
