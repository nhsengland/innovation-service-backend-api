import { ServiceRoleEnum } from '../enums';
import { TranslationHelper } from '../helpers';
import { DomainUserIdentityInfo } from '../types';

const knownDisplayNames = {
  '00000000-0000-0000-0000-000000000000': 'System'
} as Record<string, string>;

/**
 * returns the name of the user. This function will accept an object with displayName (normal use case) or a string
 * to match with known users (that don't have the B2C equivalent)
 *
 */
export const displayName = (data?: DomainUserIdentityInfo | string, role?: ServiceRoleEnum): string => {
  if (typeof data === 'string' && knownDisplayNames[data]) {
    return knownDisplayNames[data];
  }
  if (typeof data === 'object' && data.displayName) return data.displayName;
  if (role) return TranslationHelper.translate(`SERVICE_ROLES.${role}`) + ' [deleted user]';
  return '[deleted user]';
};

export class UserMap extends Map<string, DomainUserIdentityInfo> {
  getDisplayName(id?: string | null, role?: ServiceRoleEnum): string {
    return displayName(this.get(id ?? '') ?? id ?? undefined, role);
  }
}
