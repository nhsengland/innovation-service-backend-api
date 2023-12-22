import axios, { AxiosResponse } from 'axios';
import { inject, injectable } from 'inversify';

import {
  ConflictError,
  GenericErrorsEnum,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  UserErrorsEnum
} from '../../errors';

import type { IdentityUserInfo } from '../../types/domain.types';
import type { CacheConfigType, CacheService } from '../storage/cache.service';
import SHARED_SYMBOLS from '../symbols';
import type { LoggerService } from './logger.service';
import { QueuesEnum, StorageQueueService } from './storage-queue.service';

type b2cGetUserInfoByEmailDTO = {
  value: {
    id: string;
    mail: null | string;
    displayName: string;
    givenName: null | string;
    surname: null | string;
    userPrincipalName: string;
    jobTitle: null | string;
    mobilePhone: null | string;
    officeLocation: null | string;
    preferredLanguage: null | string;
  }[];
};

type b2cGetUsersListDTO = {
  value: {
    id: string;
    mail: null | string;
    displayName: string;
    givenName: null | string;
    surname: null | string;
    userPrincipalName: string;
    jobTitle: null | string;
    mobilePhone: null | string;
    officeLocation: null | string;
    preferredLanguage: null | string;
    identities: {
      signInType: 'emailAddress' | 'userPrincipalName';
      issuer: string;
      issuerAssignedId: string;
    }[];
    accountEnabled: boolean;
    createdDateTime: string;
    deletedDateTime: null | string;
    lastPasswordChangeDateTime: null | Date;
    signInActivity: {
      lastSignInDateTime: null | string;
      lastSignInRequestId: null | string;
      lastNonInteractiveSignInDateTime: null | string;
      lastNonInteractiveSignInRequestId: null | string;
    };
  }[];
};

@injectable()
export class IdentityProviderService {
  private tenantName = process.env['AD_TENANT_NAME'] || '';
  private tenantExtensionId = process.env['AD_EXTENSION_ID'] || '';
  private authData = {
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
    client_id: process.env['AD_CLIENT_ID'] || '',
    client_secret: process.env['AD_CLIENT_SECRET'] || ''
  };
  private sessionData: { token: string; expiresAt: number } = { token: '', expiresAt: 0 };
  private cache: CacheConfigType['IdentityUserInfo'];

  constructor(
    @inject(SHARED_SYMBOLS.CacheService) cacheService: CacheService,
    @inject(SHARED_SYMBOLS.LoggerService) private loggerService: LoggerService,
    @inject(SHARED_SYMBOLS.StorageQueueService) private storageQueueService: StorageQueueService
  ) {
    this.cache = cacheService.get('IdentityUserInfo');
  }

  private encodeAuthData(): string {
    return Object.entries(this.authData)
      .reduce((acc, [key, item]) => `${acc}&${encodeURIComponent(key)}=${encodeURIComponent(item)}`, '')
      .substring(1);
  }

  /**
   * Generate an access token and refresh it when it's close to expire.
   */
  private async verifyAccessToken(): Promise<void> {
    if (this.sessionData.token && Date.now() < this.sessionData.expiresAt - 300) {
      return;
    }

    const response = await axios
      .post<{
        access_token: string;
        expires_in: number;
        ext_expires_in: number;
        token_type: 'Bearer';
      }>(
        `https://login.microsoftonline.com/${this.tenantName}.onmicrosoft.com/oauth2/v2.0/token`,
        this.encodeAuthData(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      .catch(error => {
        this.loggerService.error('Error generating B2C access token', error);
        throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_IDENTIY_UNAVAILABLE, {
          details: error
        });
      });

    this.sessionData = {
      token: response.data.access_token,
      expiresAt: Date.now() + response.data.expires_in * 1000
    }; // Conversion to miliseconds needed.
  }

  private getError(status: number, message: string): Error {
    switch (status) {
      case 404:
        return new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      case 401:
        return new InternalServerError(GenericErrorsEnum.SERVICE_IDENTIY_UNAUTHORIZED);
      default:
        return new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
          details: { message }
        });
    }
  }

  /**
   * get a user from the identity provider
   *
   * this function is an envelope for the getUsersList function
   * @param identityId the user identity id
   * @returns the user
   */
  async getUserInfo(identityId: string): Promise<IdentityUserInfo> {
    const users = await this.getUsersList([identityId]);
    if (!users[0]) throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);

    return users[0];
  }

  async getUserInfoByEmail(email: string): Promise<null | {
    identityId: string;
    displayName: string;
    email: string;
    phone: null | string;
  }> {
    await this.verifyAccessToken();

    const odataFilter = `$filter=identities/any(c:c/issuerAssignedId eq '${email}' and c/issuer eq '${this.tenantName}.onmicrosoft.com')`;

    const response = await axios
      .get<b2cGetUserInfoByEmailDTO>(`https://graph.microsoft.com/v1.0/users?${odataFilter}`, {
        headers: { Authorization: `Bearer ${this.sessionData.token}` }
      })
      .catch(error => {
        throw this.getError(error.response.status, error.response.data.message);
      });

    if (response.data.value.length === 0) {
      return null;
    }

    return {
      identityId: response.data.value[0]?.id ?? '',
      displayName: response.data.value[0]?.displayName ?? '',
      email: email,
      phone: response.data.value[0]?.mobilePhone ?? null
    };
  }

  /**
   * this function checks the cache for the users and if they are not found it will fetch them from the identity provider
   *
   * @param identityIds the user identities
   * @returns list of users
   */
  async getUsersList(identityIds: string[]): Promise<IdentityUserInfo[]> {
    const uniqueUserIds = [...new Set(identityIds)]; // Remove duplicated entries.

    const res = await this.cache.getMany(uniqueUserIds);
    if (res.length !== uniqueUserIds.length) {
      const cachedUserIds = new Set(res.map(user => user.identityId));
      const nonCachedUsers = await this.getUsersListFromB2C(uniqueUserIds.filter(id => !cachedUserIds.has(id)));
      // Add new users to cache.
      await this.cache.setMany(nonCachedUsers.map(user => ({ key: user.identityId, value: user })));
      res.push(...nonCachedUsers);
    }

    return res;
  }

  /**
   * this function checks the cache for the users and if they are not found it will fetch them from the identity provider
   *
   * @param identityIds the user identities
   * @returns list of users as a map
   */
  async getUsersMap(identityIds: string[]): Promise<Map<string, IdentityUserInfo>> {
    const users = await this.getUsersList(identityIds);
    return new Map(users.map(u => [u.identityId, u]));
  }

  /**
   * returns the list of users from the identity provider
   *
   * this function splits the number of users to be fetched into chunks of 10 users
   * @param entityIds user identities to be fetched
   * @returns list of users
   */
  private async getUsersListFromB2C(entityIds: string[]): Promise<IdentityUserInfo[]> {
    if ((entityIds || []).length === 0) {
      return [];
    }

    await this.verifyAccessToken();

    const uniqueUserIds = [...new Set(entityIds)]; // Remove duplicated entries.
    const chunkSize = 10; // B2C have a maximum limit of users that can be requested in 1 call.
    const promises: Promise<AxiosResponse<b2cGetUsersListDTO>>[] = [];

    // Prepare array, with array having (chuckSize) ids.
    const userIdsChunks = uniqueUserIds.reduce((acc: string[][], item, index) => {
      const chunkIndex = Math.floor(index / chunkSize);

      if (!acc[chunkIndex]) {
        acc.push([]);
      }

      acc[chunkIndex]?.push(item);

      return acc;
    }, []);

    // Prepare necessary requests.
    for (const userId of userIdsChunks) {
      const userIds = userId.map(item => `"${item}"`).join(',');
      const odataFilter = `$filter=id in (${userIds})`;

      const fields = [
        'displayName',
        'identities',
        'email',
        'mobilePhone',
        'accountEnabled',
        'lastPasswordChangeDateTime',
        'signInActivity'
      ];

      const url = `https://graph.microsoft.com/beta/users?${odataFilter}&$select=${fields.join(',')}`;

      promises.push(
        axios.get<b2cGetUsersListDTO>(url, {
          headers: { Authorization: `Bearer ${this.sessionData.token}` }
        })
      );
    }

    // Make all calls and merge results.
    return (await Promise.all(promises)).flatMap(response =>
      response.data.value.map(u => ({
        identityId: u.id,
        displayName: u.displayName,
        email: u.identities.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId || '',
        mobilePhone: u.mobilePhone,
        isActive: u.accountEnabled,
        lastLoginAt:
          u.signInActivity && u.signInActivity.lastSignInDateTime
            ? new Date(u.signInActivity.lastSignInDateTime)
            : null,
        passwordResetAt: u.lastPasswordChangeDateTime ? new Date(u.lastPasswordChangeDateTime) : null
      }))
    );
  }

  async createUser(data: { name: string; email: string; password: string }): Promise<string> {
    await this.verifyAccessToken();

    const body = {
      accountEnabled: true,
      displayName: data.name,
      passwordPolicies: 'DisablePasswordExpiration',
      passwordProfile: { password: data.password, forceChangePasswordNextSignIn: false },
      identities: [
        {
          signInType: 'emailAddress',
          issuer: `${process.env['AD_TENANT_NAME']}.onmicrosoft.com`,
          issuerAssignedId: data.email
        }
      ],
      [`extension_${this.tenantExtensionId}_termsOfUseConsentVersion`]: 'V1',
      [`extension_${this.tenantExtensionId}_termsOfUseConsentChoice`]: 'AgreeToTermsOfUseConsentYes',
      [`extension_${this.tenantExtensionId}_termsOfUseConsentDateTime`]: new Date().toISOString(),
      [`extension_${this.tenantExtensionId}_passwordResetOn`]: new Date().toISOString()
    };

    const response = await axios
      .post<any>('https://graph.microsoft.com/v1.0/users', body, {
        headers: { Authorization: `Bearer ${this.sessionData.token}` }
      })
      .catch(error => {
        throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_IDENTIY_UNAVAILABLE, {
          details: error
        });
      });

    return response.data.id;
  }

  async updateUser(
    identityId: string,
    body: { displayName?: string; mobilePhone?: string | null; accountEnabled?: boolean }
  ): Promise<void> {
    await this.verifyAccessToken();

    // DOCS: https://docs.microsoft.com/pt-PT/graph/api/user-update?view=graph-rest-1.0&tabs=http
    // Response: 204 No Content, so we can return direcly.
    await axios
      .patch<undefined>(`https://graph.microsoft.com/v1.0/users/${identityId}`, body, {
        headers: { Authorization: `Bearer ${this.sessionData.token}` }
      })
      .catch(error => {
        throw this.getError(error.response.status, error.response.data.message);
      });
  }

  async updateUserEmail(identityId: string, email: string): Promise<void> {
    await this.verifyAccessToken();

    // DOCS: https://docs.microsoft.com/pt-PT/graph/api/user-update?view=graph-rest-1.0&tabs=http
    // Response: 204 No Content, so we can return direcly.
    await axios
      .patch<undefined>(
        `https://graph.microsoft.com/v1.0/users/${identityId}`,
        {
          identities: [
            {
              signInType: 'emailAddress',
              issuer: `${this.tenantName}.onmicrosoft.com`,
              issuerAssignedId: email
            }
          ]
        },
        {
          headers: { Authorization: `Bearer ${this.sessionData.token}` }
        }
      )
      .catch(error => {
        if (error.response.status === 400 && error.response.data?.error?.message?.includes('conflicting object')) {
          throw new ConflictError(UserErrorsEnum.USER_IDENTITY_CONFLCIT, { message: 'Email already exists' });
        }
        throw this.getError(error.response.status, error.response.data.error.message);
      });
  }

  async updateUserAsync(
    identityId: string,
    body: {
      displayName?: string;
      mobilePhone?: string | null;
      accountEnabled?: boolean;
    }
  ): Promise<boolean> {
    try {
      await this.storageQueueService.sendMessage(QueuesEnum.IDENTITY, {
        data: {
          identityId,
          body
        }
      });

      this.loggerService.log(`Identity operation sent to queue`, { identityId, body });
    } catch (error) {
      this.loggerService.error('Error sending identity operation to queue', error);
    }
    return true;
  }

  async deleteUser(identityId: string): Promise<void> {
    await this.verifyAccessToken();

    // DOCS: https://docs.microsoft.com/pt-PT/graph/api/user-delete?view=graph-rest-1.0&tabs=http
    // Response: 204 No Content, so we can return directly.
    await axios
      .delete<undefined>(`https://graph.microsoft.com/v1.0/users/${identityId}`, {
        headers: { Authorization: `Bearer ${this.sessionData.token}` }
      })
      .catch(error => {
        throw this.getError(error.response.status, error.response.data.message);
      });

    await this.cache.delete(identityId);
  }
}
