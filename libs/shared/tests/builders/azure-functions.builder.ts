/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AzureFunction, HttpRequest, HttpRequestParams } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import type { AppResponse, CustomContextType } from '../../types/request.types';
import { DTOsHelper } from '../helpers/dtos.helper';
import { MocksHelper } from '../mocks.helper';

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

  public setAuth<T extends TestUserType>(user: T, userRoleKey?: keyof T['roles']): this {
    if (!userRoleKey) {
      if (Object.keys(user.roles).length === 1) {
        userRoleKey = Object.keys(user.roles)[0];
      } else {
        throw new Error(
          'AzureHttpTriggerBuilder::setAuth: User with more than 1 role, needs userRole parameter defined.'
        );
      }
    }

    const userRequextContext = DTOsHelper.getUserRequestContext(user, userRoleKey as string);

    this.context.auth = {
      user: {
        identityId: user.identityId,
        name: randUserName(), // Name is not used.
        roleId: userRequextContext.currentRole.id
      }
    };

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
