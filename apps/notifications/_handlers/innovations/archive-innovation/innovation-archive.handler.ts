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

    // Send notifications to collaborators
    await this.AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS(innovation);

    // Send notifications to QA/A
    await this.AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A(innovation);

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

  private async AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS(innovation: { id: string; name: string }): Promise<void> {
    const collaborators = await this.recipientsService.getInnovationActiveCollaborators(this.inputData.innovationId);
    const recipients = await this.recipientsService.getUsersRecipient(collaborators, ServiceRoleEnum.INNOVATOR);

    if (!collaborators) {
      return;
    }

    this.notify('AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS', recipients, {
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
          detail: 'AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS'
        },
        innovationId: innovation.id,
        params: { innovationName: innovation.name },
        options: { includeSelf: true }
      }
    });
  }

  private async AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A(innovation: { id: string; name: string }): Promise<void> {
    const assignedQAs = await this.recipientsService.innovationAssignedRecipients(innovation.id, {});

    this.notify('AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A', assignedQAs, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          archived_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
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
          archived_url: innovationOverviewUrl(ServiceRoleEnum.ACCESSOR, innovation.id)
        },
        options: {}
      }
    });
  }

  private async AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT(innovation: {
    id: string;
    name: string;
  }): Promise<void> {
    const assignedAssessment = await this.recipientsService.needsAssessmentUsers();

    this.notify('AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT', assignedAssessment, {
      email: {
        notificationPreferenceType: 'INNOVATION_MANAGEMENT',
        params: {
          innovation_name: innovation.name,
          assessment_type: this.inputData.reassessment ? 'reassessment' : 'assessment'
        }
      }
    });
  }
}
