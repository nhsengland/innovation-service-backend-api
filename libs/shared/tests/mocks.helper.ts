import type { Context, Logger } from '@azure/functions';
import { IdentityProviderService } from '../services';

import type { TestUserType } from './builders/user.builder';
import { randUserName, randUuid } from '@ngneat/falso';

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

  static mockContext(): Context {
    const logger: Logger = ((..._args: any[]) => {
    }) as Logger;

    logger.error = (..._args: any[]) => {
    };

    logger.warn = (..._args: any[]) => {
    };

    logger.info = (..._args: any[]) => {
    };

    logger.verbose = (..._args: any[]) => {
    };

    return {
      log: logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: {
        invocationId: randUuid()
      },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        retryContext: {
          retryCount: 0,
          maxRetryCount: 0
        }
      },
      bindingDefinitions: [],
      invocationId: randUuid(),
      traceContext: {
        traceparent: randUuid(),
        tracestate: randUuid(),
        attributes: {}
      }
    };
  }
}
