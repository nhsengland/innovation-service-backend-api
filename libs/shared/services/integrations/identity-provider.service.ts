import axios from 'axios';
import { inject, injectable } from 'inversify';

import {
  BadRequestError,
  ConflictError,
  GenericErrorsEnum,
  InternalServerError,
  NotFoundError,
  ServiceUnavailableError,
  UserErrorsEnum
} from '../../errors';

import { SYSTEM_CONTEXT } from '../../constants';
import type { IdentityUserInfo } from '../../types/domain.types';
import type { CacheConfigType, CacheService } from '../storage/cache.service';
import SHARED_SYMBOLS from '../symbols';
import type { LoggerService } from './logger.service';
import { QueuesEnum, StorageQueueService } from './storage-queue.service';

import { sleep } from '../../helpers/misc.helper';

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
  private constants = {
    // More info https://learn.microsoft.com/en-us/graph/api/resources/phoneauthenticationmethod?view=graph-rest-1.0#properties
    mfa_mobile_id: '3179e48a-750b-4051-897c-87b9720928f7',
    mfa_extension_key: `extension_${process.env['AD_EXTENSION_ID'] ?? ''}_mfaByPhoneOrEmail`
  };

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
      case 400:
        return new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD, { message });
      default:
        return new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, {
          details: { message }
        });
    }
  }

  /**
   * get a user from the identity provider
   *
   * @see DomainUsersService.getIdentityUserInfo
   *
   * this function is an envelope for the getUsersList function
   * @param identityId the user identity id
   * @returns the user
   */
  async getUserInfo(identityId: string, forceRefresh?: boolean): Promise<IdentityUserInfo> {
    const users = await this.getUsersList([identityId], forceRefresh);
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
    const encodedEmail = encodeURIComponent(email);
    const odataFilter = `$filter=identities/any(c:c/issuerAssignedId eq '${encodedEmail}' and c/issuer eq '${this.tenantName}.onmicrosoft.com')`;

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
   * @see DomainUsersService.getUsersMap
   *
   * @param identityIds the user identities
   * @returns list of users
   */
  async getUsersList(identityIds: string[], forceRefresh?: boolean): Promise<IdentityUserInfo[]> {
    // Filter SYSTEM user
    identityIds = identityIds.filter(id => id !== SYSTEM_CONTEXT.identityId);

    const uniqueUserIds = [...new Set(identityIds)]; // Remove duplicated entries.

    if (forceRefresh) {
      await this.cache.deleteMany(uniqueUserIds);
    }

    const res = (await this.cache.getMany(uniqueUserIds)).map(user => ({
      ...user,
      givenName: user.givenName ?? '',
      surname: user.surname ?? ''
    }));

    if (res.length !== uniqueUserIds.length) {
      const cachedUserIds = new Set(res.map(user => user.identityId));
      const tempUsers = uniqueUserIds.filter(id => !cachedUserIds.has(id));
      const nonCachedUsers = await this.getUsersListFromB2C(tempUsers);

      // Add new users to cache.
      await this.cache.setMany(nonCachedUsers.map(user => ({ key: user.identityId, value: user })));
      res.push(...nonCachedUsers);
    }

    return res;
  }

  /**
   * this function checks the cache for the users and if they are not found it will fetch them from the identity provider
   *
   * @see DomainUsersService.getUsersMap
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
    const chunkSize = 15; // B2C has a maximum limit of users that can be requested in 1 call.
    const maxConcurrentRequests = 10; // More than 3 and we start getting 429 errors.

    // 1. Chunking
    const userIdsChunks: string[][] = [];
    for (let i = 0; i < uniqueUserIds.length; i += chunkSize) {
      userIdsChunks.push(uniqueUserIds.slice(i, i + chunkSize));
    }

    const usersList: IdentityUserInfo[] = [];

    // 2. Batch Processing
    for (let i = 0; i < userIdsChunks.length; i += maxConcurrentRequests) {
      const currentBatch = userIdsChunks.slice(i, i + maxConcurrentRequests);

      const promises = currentBatch.map(chunk => this.fetchUserBatchWithRetry(chunk));
      const settledResults = await Promise.allSettled(promises);

      const successfulResults = settledResults
        .filter((result): result is PromiseFulfilledResult<IdentityUserInfo[]> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = settledResults.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        this.loggerService.error(`[getUsersListFromB2C] ${failedCount} chunks completely failed and were skipped.`);
      }

      usersList.push(...successfulResults.flat());
    }

    return usersList;
  }

  private async fetchUserBatchWithRetry(userIds: string[]): Promise<IdentityUserInfo[]> {
    const url = this.buildB2CQueryUrl(userIds);
    let retryCount = 0;
    const maxRetries = 20;
    const maxBackoffMs = 15000; // cap at 15 seconds per retry

    while (retryCount < maxRetries) {
      try {
        const response = await axios.get<b2cGetUsersListDTO>(url, {
          headers: { Authorization: `Bearer ${this.sessionData.token}` }
        });
        return this.mapB2CUsersToDomain(response.data.value);
      } catch (error: any) {
        if (error.response?.status === 429) {
          retryCount++;
          const retryAfterHeader = error.response.headers['retry-after'];
          // Default to exponential backoff if header is missing: 2s, 4s, 8s, 16s... capped at 15s
          const backoff = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : Math.min(Math.pow(2, retryCount) * 1000, maxBackoffMs);

          this.loggerService.error(
            `B2C Rate limit hit. Retrying in ${backoff}ms... (Attempt ${retryCount}/${maxRetries})`
          );
          await sleep(backoff);
        } else {
          this.loggerService.error(JSON.stringify(error));
          throw error;
        }
      }
    }

    throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_IDENTIY_UNAVAILABLE, {
      message: 'B2C Rate limit reached and retries exhausted'
    });
  }

  private buildB2CQueryUrl(userIds: string[]): string {
    const idsFilter = userIds.map(id => `'${id}'`).join(',');
    const odataFilter = `$filter=id in (${idsFilter})`;
    const fields = [
      'displayName',
      'givenName',
      'surname',
      'identities',
      'email',
      'mobilePhone',
      'accountEnabled',
      'lastPasswordChangeDateTime',
      'signInActivity'
    ];
    return `https://graph.microsoft.com/beta/users?${odataFilter}&$select=${fields.join(',')}`;
  }

  private mapB2CUsersToDomain(b2cUsers: b2cGetUsersListDTO['value']): IdentityUserInfo[] {
    return b2cUsers.map(u => ({
      identityId: u.id,
      givenName: u.givenName ?? '',
      surname: u.surname ?? '',
      displayName: u.displayName,
      email: u.identities.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId || '',
      mobilePhone: u.mobilePhone,
      isActive: u.accountEnabled,
      lastLoginAt:
        u.signInActivity && u.signInActivity.lastSignInDateTime ? new Date(u.signInActivity.lastSignInDateTime) : null,
      passwordResetAt: u.lastPasswordChangeDateTime ? new Date(u.lastPasswordChangeDateTime) : null
    }));
  }

  async createUser(data: { givenName: string; surname: string; email: string; password: string }): Promise<string> {
    await this.verifyAccessToken();

    const body = {
      accountEnabled: true,
      givenName: data.givenName,
      surname: data.surname,
      displayName: `${data.givenName} ${data.surname}`,
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
    body: {
      givenName?: string;
      surname?: string;
      displayName?: string;
      mobilePhone?: string | null;
      accountEnabled?: boolean;
    }
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
          throw new ConflictError(UserErrorsEnum.USER_IDENTITY_CONFLICT, { message: 'Email already exists' });
        }
        throw this.getError(error.response.status, error.response.data.error.message);
      });
  }

  async updateUserAsync(
    identityId: string,
    body: {
      givenName?: string;
      surname?: string;
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

  async getMfaInfo(
    identityId: string
  ): Promise<{ type: 'none' } | { type: 'email' } | { type: 'phone'; phoneNumber?: string }> {
    const type = await this.getMfaExtensionType(identityId);

    if (type === 'phone') {
      const phoneNumber = await this.getMfaPhoneNumber(identityId);
      return { type, phoneNumber: phoneNumber ?? undefined };
    }

    return { type };
  }

  async getMfaPhoneNumber(identityId: string): Promise<string | null> {
    await this.verifyAccessToken();

    try {
      const response = await axios.get<{ id: string; phoneNumber: string; phoneType: string; smsSignInState: string }>(
        `https://graph.microsoft.com/v1.0/users/${identityId}/authentication/phoneMethods/${this.constants.mfa_mobile_id}`,
        { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
      );
      return response.data.phoneNumber;
    } catch (error: any) {
      // It means the user doesn't have a phone number created
      if (error.response.status === 404) {
        return null;
      }
      throw this.getError(error.response.status, error.response.data.message);
    }
  }

  async upsertUserMfa(
    identityId: string,
    data: { type: 'none' } | { type: 'email' } | { type: 'phone'; phoneNumber: string }
  ): Promise<void> {
    const type = await this.getMfaExtensionType(identityId);

    if (data.type === 'phone') {
      await this.upsertMfaPhoneNumber(identityId, data.phoneNumber);
    } else if (data.type === type) {
      return;
    }

    await this.updateMfaExtensionType(identityId, data.type);
  }

  private async getMfaExtensionType(identityId: string): Promise<'none' | 'email' | 'phone'> {
    await this.verifyAccessToken();

    const response = await axios
      .get<any>(`https://graph.microsoft.com/v1.0/users/${identityId}?$select=${this.constants.mfa_extension_key}`, {
        headers: { Authorization: `Bearer ${this.sessionData.token}` }
      })
      .catch(error => {
        throw this.getError(error.response.status, error.response.data.message);
      });

    return response.data[this.constants.mfa_extension_key] ?? 'none';
  }

  private async updateMfaExtensionType(identityId: string, type: 'none' | 'email' | 'phone'): Promise<void> {
    await this.verifyAccessToken();

    await axios
      .patch<any>(
        `https://graph.microsoft.com/v1.0/users/${identityId}`,
        { [this.constants.mfa_extension_key]: type },
        { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
      )
      .catch(error => {
        throw this.getError(error.response.status, error.response.data.message);
      });
  }
  private async upsertMfaPhoneNumber(identityId: string, phoneNumber: string): Promise<void> {
    const curPhoneNumber = await this.getMfaPhoneNumber(identityId);

    // No need to hit B2C if the user is trying to update to the same phone.
    if (curPhoneNumber === phoneNumber) return;

    try {
      if (curPhoneNumber !== null) {
        await axios.patch<any>(
          `https://graph.microsoft.com/v1.0/users/${identityId}/authentication/phoneMethods/${this.constants.mfa_mobile_id}`,
          { phoneNumber, phoneType: 'mobile' },
          { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
        );
      } else {
        await axios.post<any>(
          `https://graph.microsoft.com/v1.0/users/${identityId}/authentication/phoneMethods`,
          { phoneNumber, phoneType: 'mobile' },
          { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
        );
      }
    } catch (error: any) {
      throw this.getError(error.response.status, error.response.data.error.message);
    }
  }
}
