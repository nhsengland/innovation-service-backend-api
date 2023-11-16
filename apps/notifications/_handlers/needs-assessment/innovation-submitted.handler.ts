import type { Context } from '@azure/functions';
import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { innovationOverviewUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';

export class InnovationSubmittedHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_SUBMITTED,
  | 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR'
  | 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITTED],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);

    await this.NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR(innovation);
    await this.NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT(innovation);

    return this;
  }

  async NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR(innovation: {
    name: string;
    id: string;
  }): Promise<void> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(
      this.inputData.innovationId
    );
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);

    this.notify('NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR', recipients, {
      email: {
        notificationPreferenceType: 'NEEDS_ASSESSMENT',
        params: {
          innovation_name: innovation.name,
          needs_assessment: this.inputData.reassessment ? 'reassessment' : 'assessment'
        },
        options: {
          includeSelf: true
        }
      },
      inApp: {
        context: {
          type: 'NEEDS_ASSESSMENT',
          id: innovation.id,
          detail: 'NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR'
        },
        innovationId: innovation.id,
        params: {
          needsAssessment: this.inputData.reassessment ? 'reassessment' : 'assessment',
          innovationName: innovation.name
        },
        options: {
          includeSelf: true
        }
      }
    });
  }

  async NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT(innovation: {
    name: string;
    id: string;
  }): Promise<void> {
    const recipients = await this.recipientsService.needsAssessmentUsers();
    this.notify('NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT', recipients, {
      email: {
        notificationPreferenceType: 'NEEDS_ASSESSMENT',
        params: {
          innovation_name: innovation.name,
          innovation_overview_url: innovationOverviewUrl(ServiceRoleEnum.ASSESSMENT, innovation.id),
          needs_assessment: this.inputData.reassessment ? 'reassessment' : 'assessment'
        }
      },
      inApp: {
        context: {
          type: 'NEEDS_ASSESSMENT',
          id: innovation.id,
          detail: 'NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT'
        },
        innovationId: innovation.id,
        params: {
          innovationName: innovation.name,
          needsAssessment: this.inputData.reassessment ? 'reassessment' : 'assessment'
        }
      }
    });
  }
}
