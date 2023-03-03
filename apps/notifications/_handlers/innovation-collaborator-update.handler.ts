import { IdentityProviderServiceSymbol, IdentityProviderServiceType } from '@notifications/shared/services';
import { InnovationCollaboratorStatusEnum, NotificationContextDetailEnum, NotificationContextTypeEnum, NotifierTypeEnum } from '@notifications/shared/enums';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import { BaseHandler } from './base.handler';
import { EmailErrorsEnum, NotFoundError, UserErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';


export class InnovationCollaboratorUpdateHandler extends BaseHandler<
  NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE,
  EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER | EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR | EmailTypeEnum.INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR, 
  { collaboratorId: string }
> {

  private identityProviderService = container.get<IdentityProviderServiceType>(IdentityProviderServiceSymbol);
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);

  constructor(
    requestUser: { id: string, identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE],
    domainContext: DomainContextType,
  ) {
    super(requestUser, data, domainContext);
  }


  async run(): Promise<this> {

    if ([InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.DECLINED, InnovationCollaboratorStatusEnum.LEFT].includes(this.inputData.innovationCollaborator.status)) {
      await this.prepareNotificationToOwner();
    }
    
    if ([InnovationCollaboratorStatusEnum.CANCELLED, InnovationCollaboratorStatusEnum.REMOVED].includes(this.inputData.innovationCollaborator.status)) {
      await this.prepareNotificationToCollaborator();
    }

    return this;
  }
  
  async prepareNotificationToOwner(): Promise<void> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const innovationOwnerInfo = await this.identityProviderService.getUserInfo(innovation.owner.identityId);
    const innovationCollaborator = await this.recipientsService.innovationCollaboratorInfo(this.inputData.innovationCollaborator.id);
    const collaboratorInfo = await this.identityProviderService.getUserInfoByEmail(innovationCollaborator.email);
    
    if (!collaboratorInfo) {
      throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    }

    let templateId: EmailTypeEnum;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.ACTIVE:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_ACCEPTED_TO_OWNER;
        break;
      case InnovationCollaboratorStatusEnum.DECLINED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_DECLINED_TO_OWNER;
        break;
      case InnovationCollaboratorStatusEnum.LEFT:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_LEAVES_TO_OWNER;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    this.emails.push({
      templateId,
      to: { type: 'identityId', value: innovationOwnerInfo.identityId, displayNameParam: 'display_name' },
      params: {
        collaborator_name: collaboratorInfo.displayName,
        innovation_name: innovation.name,
        ...(this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.LEFT ? { innovation_url: new UrlModel(ENV.webBaseTransactionalUrl).addPath('innovator/innovations/:innovationId').setPathParams({ innovationId: this.inputData.innovationId }).buildUrl() } : { } )
      }
    });
  }
  
  async prepareNotificationToCollaborator(): Promise<void> {

    const innovation = await this.recipientsService.innovationInfoWithOwner(this.inputData.innovationId);
    const innovationOwnerInfo = await this.identityProviderService.getUserInfo(innovation.owner.identityId);
    const innovationCollaborator = await this.recipientsService.innovationCollaboratorInfo(this.inputData.innovationCollaborator.id);

    let templateId: EmailTypeEnum;

    switch (this.inputData.innovationCollaborator.status) {
      case InnovationCollaboratorStatusEnum.CANCELLED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_INVITE_CANCELLED_TO_COLLABORATOR;
        break;
      case InnovationCollaboratorStatusEnum.REMOVED:
        templateId = EmailTypeEnum.INNOVATION_COLLABORATOR_REMOVED_TO_COLLABORATOR;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    this.emails.push({
      templateId,
      to: { type: 'email', value: innovationCollaborator.email , ...(this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.REMOVED ? { displayNameParam: 'display_name' } : { })},
      params: {
        innovator_name: innovationOwnerInfo.displayName,
        innovation_name: innovation.name
      }
    });

    if (this.inputData.innovationCollaborator.status === InnovationCollaboratorStatusEnum.CANCELLED) {
      if (innovationCollaborator.user) { // user exists in the service
        this.inApp.push({
          innovationId: this.inputData.innovationId,
          context: { type: NotificationContextTypeEnum.COLLABOARATOR, detail: NotificationContextDetailEnum.COLLABORATOR_UPDATE, id: this.inputData.innovationCollaborator.id },         
          users: [{ userId: innovationCollaborator.user.id, roleId: innovationCollaborator.user.roleId }],
          params: {
            collaboratorId: innovationCollaborator.id
          }
        });
      }
    } 
  }
}
