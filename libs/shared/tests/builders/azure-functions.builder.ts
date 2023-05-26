import type { AzureFunction, HttpRequest, HttpRequestParams } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import type { ServiceRoleEnum } from '../../enums/user.enums';
import { DTOsHelper } from '../helpers/dtos.helper';
import { MocksHelper } from '../mocks.helper';
import { DomainUsersService } from '../../services/domain/domain-users.service';
import type { AppResponse, CustomContextType } from '../../types';

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
    // user: {
    //   id: randUuid(),
    //   type: 'AppService',
    //   username: randUserName(),
    //   identityProvider: 'AzureAD',
    //   claimsPrincipalData: {}
    // },
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

  public setAuth(user: TestUserType, userRole?: ServiceRoleEnum): this {

    const userRequextContext = DTOsHelper.getUserRequestContext(user, userRole);

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
      roles: user.roles,
      phone: user.mobilePhone,
      isActive: user.isActive,
      lockedAt: user.lockedAt,
      passwordResetAt: null,
      firstTimeSignInAt: null,
      organisations: user.organisations
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
