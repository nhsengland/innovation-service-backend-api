import type { NotifierTemplatesType } from '@innovations/shared/types';
import type { EmailNotificationPreferenceEnum, EmailNotificationTypeEnum, NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';
import { BaseHandler } from './base.handler';




export class NeedsAssessmentStartedHandler extends BaseHandler<
NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED,
EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
Record<string, never>
> {

    private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

    private data: {
        innovation?: { name: string, owner: { id: string, identityId: string, type: UserTypeEnum, emailNotificationPreferences: { type: EmailNotificationTypeEnum, preference: EmailNotificationPreferenceEnum }[] } },
      } = {};

    constructor(
        requestUser: { id: string, identityId: string, type: UserTypeEnum },
        data: NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]
      ) {
        super(requestUser, data);
      }
    

    async run(): Promise<this> {

        this.data.innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);

        await this.prepareEmailForInnovator();
        
        return this;
    }

    async prepareEmailForInnovator(): Promise<void> {

      this.emails.push({
        templateId: EmailTypeEnum.NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR,
        to: { type: 'identityId', value: this.data.innovation?.owner.identityId || '', displayNameParam: 'display_name' },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: this.data.innovation?.name || '',
          message_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/threads/:threadId')
            .setPathParams({ innovationId: this.inputData.innovationId, threadId: this.inputData.threadId  })
            .buildUrl()
        }
      });

    }

    
    
}