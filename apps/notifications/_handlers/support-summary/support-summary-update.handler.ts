import type { Context } from '@azure/functions';
import { InnovationSupportStatusEnum, ServiceRoleEnum, type NotifierTypeEnum } from '@notifications/shared/enums';
import {
  isAccessorDomainContextType,
  type DomainContextType,
  type NotifierTemplatesType
} from '@notifications/shared/types';
import { supportSummaryUrl } from '../../_helpers/url.helper';
import { BaseHandler } from '../base.handler';
import { randomUUID } from 'crypto';

export class SupportSummaryUpdateHandler extends BaseHandler<
  NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE,
  'SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS' | 'SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    if (!isAccessorDomainContextType(this.requestUser)) {
      return this;
    }

    const innovation = await this.recipientsService.innovationInfo(this.inputData.innovationId);
    const unit = { id: this.requestUser.organisation.organisationUnit.id, name: this.getRequestUnitName() };

    if (this.inputData.whetherToNotify !== 'no') {
      await this.SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS(innovation, unit);
    }
    await this.SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS(innovation, unit);

    return this;
  }

  private async SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS(
    innovation: { id: string; name: string },
    unit: { id: string; name: string }
  ): Promise<void> {
    const innovators = await this.recipientsService.getInnovationActiveOwnerAndCollaborators(innovation.id);
    const recipients = await this.recipientsService.getUsersRecipient(innovators, ServiceRoleEnum.INNOVATOR);
    const notificationId = randomUUID();

    this.addEmails('SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS', recipients, {
      notificationPreferenceType: 'SUPPORT',
      params: {
        innovation_name: innovation.name,
        unit_name: unit.name,
        date: this.inputData.date,
        support_summary_update_url: supportSummaryUrl(
          ServiceRoleEnum.INNOVATOR,
          this.inputData.innovationId,
          notificationId,
          unit.id
        )
      }
    });

    this.addInApp('SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS', recipients, {
      context: {
        type: 'SUPPORT',
        detail: 'SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        unitName: unit.name,
        date: this.inputData.date,
        unitId: unit.id
      },
      notificationId
    });
  }

  private async SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS(
    innovation: { id: string; name: string },
    unit: { id: string; name: string }
  ): Promise<void> {
    const recipients = (
      await this.recipientsService.innovationAssignedRecipients(innovation.id, {
        supportStatus: [InnovationSupportStatusEnum.ENGAGING]
      })
    ).filter(r => r.unitId !== unit.id);
    const notificationId = randomUUID();

    this.addEmails('SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS', recipients, {
      notificationPreferenceType: 'SUPPORT',
      params: {
        innovation_name: innovation.name,
        unit_name: unit.name,
        date: this.inputData.date,
        support_summary_update_url: supportSummaryUrl(
          ServiceRoleEnum.ACCESSOR,
          this.inputData.innovationId,
          notificationId,
          unit.id
        )
      }
    });

    this.addInApp('SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS', recipients, {
      context: {
        type: 'SUPPORT',
        detail: 'SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS',
        id: this.inputData.supportId
      },
      innovationId: innovation.id,
      params: {
        innovationName: innovation.name,
        unitName: unit.name,
        date: this.inputData.date,
        unitId: unit.id
      },
      notificationId
    });
  }
}
