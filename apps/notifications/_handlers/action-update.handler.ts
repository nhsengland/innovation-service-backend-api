import type { UserRoleEntity } from '@notifications/shared/entities';
import {
  EmailNotificationPreferenceEnum,
  EmailNotificationTypeEnum,
  InnovationActionStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import { EmailErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { DomainServiceSymbol, DomainServiceType } from '@notifications/shared/services';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';

import { container, EmailTypeEnum, ENV } from '../_config';
import { RecipientsServiceSymbol, RecipientsServiceType } from '../_services/interfaces';

import type { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import { BaseHandler } from './base.handler';

export class ActionUpdateHandler extends BaseHandler<
  NotifierTypeEnum.ACTION_UPDATE,
  | EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR
  | EmailTypeEnum.ACTION_DECLINED_TO_INNOVATOR
  | EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR,
  {
    actionCode: string;
    actionStatus: '' | InnovationActionStatusEnum;
    section: CurrentCatalogTypes.InnovationSections;
  }
> {
  private recipientsService = container.get<RecipientsServiceType>(RecipientsServiceSymbol);
  private domainService = container.get<DomainServiceType>(DomainServiceSymbol);

  private data: {
    innovation?: {
      name: string;
      owner: {
        id: string;
        identityId: string;
        userRole: UserRoleEntity;
        isActive: boolean;
        emailNotificationPreferences: {
          type: EmailNotificationTypeEnum;
          preference: EmailNotificationPreferenceEnum;
        }[];
      };
    };
    actionInfo?: {
      id: string;
      displayId: string;
      status: InnovationActionStatusEnum;
      organisationUnit?: { id: string; name: string };
      owner: { id: string; identityId: string; roleId: string };
    };
    comment?: string;
  } = {};

  constructor(
    requestUser: { id: string; identityId: string },
    data: NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE],
    domainContext: DomainContextType
  ) {
    super(requestUser, data, domainContext);
  }

  async run(): Promise<this> {
    this.data.innovation = await this.recipientsService.innovationInfoWithOwner(
      this.inputData.innovationId
    );
    this.data.actionInfo = await this.recipientsService.actionInfoWithOwner(
      this.inputData.action.id
    );

    switch (this.domainContext.currentRole.role) {
      case ServiceRoleEnum.INNOVATOR:
        await this.prepareInAppForAccessor();
        if (this.data.actionInfo.status === InnovationActionStatusEnum.DECLINED) {
          await this.prepareEmailForAccessor();
          await this.prepareInAppForInnovator();
          await this.prepareEmailForInnovator();
        }
        break;

      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        await this.prepareInAppForInnovator();
        if (this.data.actionInfo.status === InnovationActionStatusEnum.CANCELLED) {
          await this.prepareEmailForInnovator();
        }
        break;

      default:
        break;
    }

    return this;
  }

  // Private methods.

  private async prepareInAppForAccessor(): Promise<void> {
    // This should never happen
    if (!this.data.actionInfo) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id,
      },
      userRoleIds: [this.data.actionInfo.owner.roleId],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section,
      },
    });
  }

  private async prepareEmailForAccessor(): Promise<void> {
    let templateId: EmailTypeEnum;
    switch (this.data.actionInfo?.status) {
      case InnovationActionStatusEnum.DECLINED:
        templateId = EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR;
        break;
      default:
        throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
    }

    const requestInfo = await this.domainService.users.getUserInfo({ userId: this.requestUser.id });

    // Don't send email to inactive Accessor
    if (!requestInfo.isActive) {
      return;
    }

    this.emails.push({
      templateId: templateId,
      to: {
        type: 'identityId',
        value: this.data.actionInfo.owner.id,
        displayNameParam: 'display_name',
      },
      params: {
        // display_name: '', // This will be filled by the email-listener function.
        innovator_name: requestInfo.displayName,
        innovation_name: this.data.innovation?.name ?? '',
        declined_action_reason: this.inputData.comment ?? '',
        action_url: new UrlModel(ENV.webBaseTransactionalUrl)
          .addPath('accessor/innovations/:innovationId/action-tracker/:actionId')
          .setPathParams({
            innovationId: this.inputData.innovationId,
            actionId: this.inputData.action.id,
          })
          .buildUrl(),
      },
    });
  }

  private async prepareInAppForInnovator(): Promise<void> {
    // This never happens
    if (!this.data.innovation?.owner) {
      return;
    }

    this.inApp.push({
      innovationId: this.inputData.innovationId,
      context: {
        type: NotificationContextTypeEnum.ACTION,
        detail: NotificationContextDetailEnum.ACTION_UPDATE,
        id: this.inputData.action.id,
      },
      userRoleIds: [this.data.innovation.owner.userRole.id],
      params: {
        actionCode: this.data.actionInfo?.displayId || '',
        actionStatus: this.inputData.action.status, // We use here the supplied action status, NOT the action status from query.
        section: this.inputData.action.section,
      },
    });
  }

  private async prepareEmailForInnovator(): Promise<void> {
    // This never happens
    if (!this.data.innovation) {
      return;
    }

    if (
      this.isEmailPreferenceInstantly(
        EmailNotificationTypeEnum.ACTION,
        this.data.innovation.owner.emailNotificationPreferences
      ) &&
      this.data.innovation.owner.isActive
    ) {
      let templateId: EmailTypeEnum;
      switch (this.data.actionInfo?.status) {
        case InnovationActionStatusEnum.CANCELLED:
          templateId = EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR;
          break;
        case InnovationActionStatusEnum.DECLINED:
          templateId = EmailTypeEnum.ACTION_DECLINED_TO_INNOVATOR;
          break;
        default:
          throw new NotFoundError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND);
      }

      const requestInfo = await this.domainService.users.getUserInfo({
        userId: this.requestUser.id,
      });

      let accessor_name = requestInfo.displayName;
      let unit_name = this.domainContext?.organisation?.organisationUnit?.name ?? '';

      if (this.domainContext.currentRole.role === ServiceRoleEnum.INNOVATOR) {
        accessor_name = (
          await this.domainService.users.getUserInfo({ userId: this.data.actionInfo.owner.id })
        ).displayName;
        unit_name = this.data.actionInfo.organisationUnit?.name ?? '';
      }

      this.emails.push({
        templateId,
        to: {
          type: 'identityId',
          value: this.data.innovation?.owner.identityId || '',
          displayNameParam: 'display_name',
        },
        params: {
          // display_name: '', // This will be filled by the email-listener function.
          accessor_name: accessor_name,
          unit_name: unit_name,
          action_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
            .setPathParams({
              innovationId: this.inputData.innovationId,
              actionId: this.inputData.action.id,
            })
            .buildUrl(),
        },
      });
    }
  }
}
