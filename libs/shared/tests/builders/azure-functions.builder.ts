/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AzureFunction, HttpRequest, HttpRequestParams } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import { DTOsHelper } from '../helpers/dtos.helper';
import { MocksHelper } from '../mocks.helper';
import { DomainUsersService } from '../../services/domain/domain-users.service';
import type { AppResponse, CustomContextType, RoleType } from '../../types';

import type { TestUserOrganisationUnitType, TestUserOrganisationsType, TestUserType } from './user.builder';

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

  public setAuth<
    T extends Pick<
      TestUserType,
      'id' | 'identityId' | 'email' | 'name' | 'mobilePhone' | 'isActive' | 'lockedAt' | 'roles' | 'organisations'
    >
  >(user: T, userRoleKey?: keyof T['roles']): this {
    if (!userRoleKey) {
      if ([...Object.keys(user.roles)].length === 1) {
        userRoleKey = [...Object.keys(user.roles)][0]!;
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

    const organisations = [...Object.keys(user.organisations).map(key => user.organisations[key])].filter(
      (item): item is TestUserOrganisationsType => !!item
    );

    jest.spyOn(DomainUsersService.prototype, 'getUserInfo').mockResolvedValue({
      id: user.id,
      identityId: user.identityId,
      email: user.email,
      displayName: user.name,
      roles: [...Object.keys(user.roles).map(key => user.roles[key])].filter((item): item is RoleType => !!item),
      phone: user.mobilePhone,
      isActive: user.isActive,
      lockedAt: user.lockedAt,
      passwordResetAt: null,
      firstTimeSignInAt: null,
      organisations: organisations.map(org => ({
        ...org,
        organisationUnits: [...Object.keys(org.organisationUnits).map(key => org.organisationUnits[key])].filter(
          (item): item is TestUserOrganisationUnitType => !!item
        )
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
