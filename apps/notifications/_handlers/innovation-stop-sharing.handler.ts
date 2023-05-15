import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { EmailTypeEnum, ENV } from '../_config';

import { BaseHandler } from './base.handler';

export class InnovationStopSharingHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_STOP_SHARING,
  EmailTypeEnum.INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS | EmailTypeEnum.INNOVATION_STOP_SHARING_TO_INNOVATOR,
  Record<string, never>
> {
  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    if (this.domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const previousAssignedAccessors = await this.recipientsService.usersBagToRecipients(
      this.inputData.previousAssignedAccessors
    );

    const owner = await this.recipientsService.getUsersRecipient(innovation.ownerId, ServiceRoleEnum.INNOVATOR);
    const ownerIdentity = await this.recipientsService.usersIdentityInfo(innovation.ownerIdentityId);

    if (owner?.isActive) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_STOP_SHARING_TO_INNOVATOR,
        to: owner,
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath(':userBasePath/innovations/:innovationId')
            .setPathParams({
              userBasePath: this.frontendBaseUrl(ServiceRoleEnum.INNOVATOR),
              innovationId: this.inputData.innovationId
            })
            .buildUrl()
        }
      });
    }

    for (const user of previousAssignedAccessors) {
      this.emails.push({
        templateId: EmailTypeEnum.INNOVATION_STOP_SHARING_TO_ENGAGING_ACCESSORS,
        notificationPreferenceType: 'SUPPORT',
        to: user,
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          innovation_name: innovation.name,
          innovator_name: ownerIdentity?.displayName ?? 'user', // Review what should happen if user is not found
          stop_sharing_comment: this.inputData.message
        }
      });
    }

    /*
     * Disable the inApp notifications for now in accordance with the XLS
     *
    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: { type: NotificationContextTypeEnum.INNOVATION, detail: NotificationContextDetailEnum.INNOVATION_STOP_SHARING, id: this.inputData.innovationId },
      users: this.inputData.previousAssignedAccessors.map(item => ({ userId: item.id, userType: item.userType, organisationUnitId: item.organisationUnitId })),
      params: {}
    });
    */

    return this;
  }
}
