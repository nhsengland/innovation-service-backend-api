import type { Schema } from 'joi';

import type {
  NotificationCategoryType,
  NotifierTypeEnum} from '@notifications/shared/enums';
import {
  NotificationPreferenceEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
// import { GenericErrorsEnum, InternalServerError } from '@notifications/shared/errors';

import type { Context } from '@azure/functions';
import { GenericErrorsEnum, NotImplementedError } from '@notifications/shared/errors';
import { TranslationHelper } from '@notifications/shared/helpers';
import type { DomainContextType } from '@notifications/shared/types';
import { NOTIFICATIONS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/base.handler';

export class HandlersHelper {
  static async runHandler(
    //TODO: Add azure function context for logs
    requestUser: DomainContextType,
    action: NotifierTypeEnum,
    params: any, // TODO: Add type, issues with the Record<string, never> from the recurrent notifications
    azureContext: Context
  ): Promise<BaseHandler<NotifierTypeEnum, any>> {
    return new NOTIFICATIONS_CONFIG[action].handler(requestUser, params, azureContext).run();
  }

  static handlerJoiDefinition(action: NotifierTypeEnum): Schema {
    return NOTIFICATIONS_CONFIG[action].joiDefinition;
  }

  static getNotificationDisplayTag(
    role: ServiceRoleEnum,
    data: { unitName?: string | null; isOwner?: boolean }
  ): string {
    switch (role) {
      case ServiceRoleEnum.ACCESSOR:
      case ServiceRoleEnum.QUALIFYING_ACCESSOR:
        return data.unitName ?? '';
      case ServiceRoleEnum.ASSESSMENT:
      case ServiceRoleEnum.ADMIN:
        return TranslationHelper.translate(`TEAMS.${role}`);
      case ServiceRoleEnum.INNOVATOR:
        return data.isOwner === undefined ? 'Innovator' : data.isOwner ? 'Owner' : 'Collaborator';
      default: {
        const r: never = role;
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR, { details: r });
      }
    }
  }

  static transformIntoBullet(arr: string[], prefix: '-' | '*' = '*'): string {
    return arr.map(str => `${prefix} ${str} \n`).join('');
  }

  static getRequestUnitName(requestUser: DomainContextType): string {
    return requestUser.currentRole.role === ServiceRoleEnum.ASSESSMENT
      ? TranslationHelper.translate(`TEAMS.${requestUser.currentRole.role}`)
      : requestUser.organisation?.organisationUnit?.name ?? '';
  }

  /**
   * Helper method to verify users email notification preferences.
   * Ex: this.shouldSendEmail(TASK, userData);
   */
  static shouldSendEmail(
    type: NotificationCategoryType,
    data?: Partial<{ [k in NotificationCategoryType]: NotificationPreferenceEnum }>
  ): boolean {
    return !data || !data[type] || data[type] === NotificationPreferenceEnum.YES;
  }

  static formatStringArray(arr: string[]): string {
    if (arr.length === 0) {
      return '';
    } else if (arr.length === 1) {
      return `${arr[0]}`;
    } else {
      const lastItem = arr.pop();
      return `${arr.join(', ')} and ${lastItem}`;
    }
  }
}
