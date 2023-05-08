import { IdentityProviderService } from '../services';

import type { TestUserType } from './builders/user.builder';


export class MocksHelper {

  static mockIdentityServiceGetUserInfo(user: TestUserType): void {

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockResolvedValue({
      identityId: user.identityId,
      displayName: user.name,
      email: user.email,
      mobilePhone: user.mobilePhone,
      isActive: user.isActive,
      passwordResetAt: null,
      lastLoginAt: null
    });

  }

}
