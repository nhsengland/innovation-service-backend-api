import type { Context, Logger } from '@azure/functions';

import { randUserName, randUuid } from '@ngneat/falso';
import { IdentityProviderService } from '../services/integrations/identity-provider.service';
import type { TestUserType } from './builders/user.builder';
// import { JwtDecoder } from '../decorators';

export class MocksHelper {
  // TODO: Not working yet!
  // static mockJwtDecoderDecorator(_app: 'admin' | 'innovations' | 'notifications' | 'users'): void {

  //   jest.fn(JwtDecoder).mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)

  //   // jest.mock(`../decorators`, () => ({
  //   //   JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => descriptor)
  //   // }));

  // }

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

  static mockContext(): Context {
    const logger = ((..._args: any[]): void => {}) as Logger;
    logger.error = (..._args: any[]) => {};
    logger.warn = (..._args: any[]) => {};
    logger.info = (..._args: any[]) => {};
    logger.verbose = (..._args: any[]) => {};

    return {
      invocationId: randUuid(),
      log: logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: { invocationId: randUuid() },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        retryContext: { retryCount: 0, maxRetryCount: 0 }
      },
      bindingDefinitions: [],
      traceContext: {
        traceparent: null,
        tracestate: null,
        attributes: null
      }
    };
  }
}
