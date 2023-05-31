/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AzureFunction, HttpRequest, HttpRequestParams } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import { DTOsHelper } from '../helpers/dtos.helper';
import { MocksHelper } from '../mocks.helper';
import { DomainUsersService } from '../../services/domain/domain-users.service';
import type { AppResponse, CustomContextType } from '../../types/request.types';

import type { TestUserType } from './user.builder';

export class AzureHttpTriggerBuilder {
  private context: CustomContextType;
  private request: HttpRequest = {
    url: '',
    method: null,
    headers: {},
    rawBody: {},
    body: {},
    params: {},
    query: {},
    user: null,
    parseFormBody: () => {
      throw new Error('Function not implemented.');
    }
  };

  constructor() {
    this.context = {
      auth: { user: { identityId: randUuid(), name: randUserName() } },
      ...MocksHelper.mockContext()
    };
  }

  // public setUrl(url: string): this {
  //   this.request.url = url;
  //   return this;
  // }

  // public setMethod(method: HttpMethod): this {
  //   this.request.method = method;
  //   return this;
  // }

  // public setHeaders(headers: { [key: string]: string }): this {
  //   this.request.headers = headers;
  //   return this;
  // }

  public setAuth(user: TestUserType, userRoleKey?: keyof TestUserType['roles']): this {

    if (!userRoleKey) {
      if (Object.keys(user.roles).length === 1) {
        userRoleKey = Object.keys(user.roles)[0];
      } else {
        throw new Error('DTOsHelper::getUserContext: User with more than 1 role, needs userRole parameter defined.');
      }
    }

    const userRequextContext = DTOsHelper.getUserRequestContext(user, userRoleKey);

    this.context.auth = {
      user: {
        identityId: user.identityId,
        name: randUserName(), // Name is not used.
        roleId: userRequextContext.currentRole.id
      }
    };

    jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
      id: user.id,
      identityId: user.identityId,
      email: user.email,
      displayName: user.name,
      roles: Object.values(user.roles),
      phone: user.mobilePhone,
      isActive: user.isActive,
      lockedAt: user.lockedAt,
      passwordResetAt: null,
      firstTimeSignInAt: null,
      organisations: Object.values(user.organisations).map(organisation => ({
        ...organisation,
        organisationUnits: Object.values(organisation.organisationUnits)
      }))
    });

    return this;

  }

  public setBody<T extends { [key: string]: any }>(body: T): this {
    this.request.body = body;
    return this;
  }

  public setParams<T extends HttpRequestParams>(params: T): this {
    this.request.params = params;
    return this;
  }

  public async call<T>(func: AzureFunction): Promise<AppResponse<T>> {
    await func(this.context, this.request);
    return this.context.res as AppResponse<T>;
  }
}

export class AzureQueueTriggerBuilder {
  private context: CustomContextType;
  private request: { data: Record<string, unknown> } = { data: {} };

  constructor() {
    this.context = {
      auth: { user: { identityId: randUuid(), name: randUserName() } },
      ...MocksHelper.mockContext()
    };
  }

  public setRequestData(data: Record<string, unknown>): this {
    this.request.data = data;
    return this;
  }

  public async call<T>(func: AzureFunction): Promise<T> {
    await func(this.context, this.request);
    return this.context.res as T;
  }
}
