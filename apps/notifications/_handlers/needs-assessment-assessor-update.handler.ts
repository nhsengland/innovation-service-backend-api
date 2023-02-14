import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';


export class NeedsAssessmentAssessorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE,
  EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA | EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA,
  Record<string, never>
> {

  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

    // Prepare email for previous NA.
    this.emails.push({
      templateId: EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_OLD_NA,
      to: { type: 'identityId', value: this.inputData.previousAssessor.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovation.name,
        innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('assessment/innovations/:innovationId')
          .setPathParams({ innovationId: this.inputData.innovationId })
          .buildUrl()
      }
    });

    // Prepare email for new NA.
    this.emails.push({
      templateId: EmailTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE_TO_NEW_NA,
      to: { type: 'identityId', value: this.inputData.newAssessor.identityId, displayNameParam: 'display_name' },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovation_name: innovation.name,
        innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('assessment/innovations/:innovationId')
          .setPathParams({ innovationId: this.inputData.innovationId, assessmentId: this.inputData.assessmentId })
          .buildUrl()
      }
    });
    
    return this;

  }

}
