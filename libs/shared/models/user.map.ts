import { ServiceRoleEnum } from '../enums';
import { TranslationHelper } from '../helpers';
import { DomainUserIdentityInfo } from '../types';

export const displayName = (data?: DomainUserIdentityInfo, role?: ServiceRoleEnum): string => {
  if (data?.displayName) return data.displayName;
  if (role) return TranslationHelper.translate(`SERVICE_ROLES.${role}`) + ' [deleted user]';
  return '[deleted user]';
};

export class UserMap extends Map<string, DomainUserIdentityInfo> {
  getDisplayName(id?: string | null, role?: ServiceRoleEnum): string {
    return displayName(this.get(id ?? ''), role);
  }
}
