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
import { getExponentialBackoffMs, getRetryAfterMsFromHeaders, isRetryableHttpStatus } from '../../helpers/retry.helper';

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
    identities?: {
      signInType: 'emailAddress' | 'userPrincipalName';
      issuer: string;
      issuerAssignedId: string;
    }[];
    accountEnabled: boolean;
    createdDateTime: string;
    deletedDateTime: null | string;
    lastPasswordChangeDateTime: null | string;
    signInActivity?: {
      lastSignInDateTime: null | string;
      lastSignInRequestId: null | string;
      lastNonInteractiveSignInDateTime: null | string;
      lastNonInteractiveSignInRequestId: null | string;
    };
  }[];
};

type B2CUser = b2cGetUsersListDTO['value'][number];

type B2CBatchSubResponse = {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: B2CUser | { error?: { code?: string; message?: string } };
};

type B2CBatchResponseDTO = {
  responses?: B2CBatchSubResponse[];
};

type B2CBatchRequest = {
  id: string;
  method: 'GET';
  url: string;
};

type B2CBatchProcessingResult = {
  retryAfterMs?: number;
  retryUserIds: string[];
  users: IdentityUserInfo[];
};

class B2CBatchRequestError extends Error {
  constructor(
    public readonly status: number | undefined,
    public readonly retryAfterMs: number | undefined,
    public readonly retryable: boolean,
    message: string
  ) {
    super(message);
    this.name = 'B2CBatchRequestError';
  }
}

const B2C_BATCH_SIZE = 20;
const B2C_MAX_CONCURRENT_BATCHES = 3;
const B2C_MAX_RETRIES = 20;
const B2C_MAX_BACKOFF_MS = 1 * 60 * 60 * 1000;
const B2C_BATCH_FIELDS = [
  'id',
  'displayName',
  'jobTitle',
  'identities',
  'mobilePhone',
  'accountEnabled',
  'lastPasswordChangeDateTime',
  'signInActivity'
];

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
  private missingUserQuarantine = new Set<string>();
  private constants = {
    // More info https://learn.microsoft.com/en-us/graph/api/resources/phoneauthenticationmethod?view=graph-rest-1.0#properties
    mfa_mobile_id: '3179e48a-750b-4051-897c-87b9720928f7',
    mfa_extension_key: `extension_${process.env['AD_EXTENSION_ID'] ?? ''}_mfaByPhoneOrEmail`
  };

  private isAMissingUserWhichWasQuarantined(identityId: string): boolean {
    return this.missingUserQuarantine.has(identityId);
  }

  private quarantineMissingUser(identityId: string): void {
    this.missingUserQuarantine.add(identityId);
  }

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
      uniqueUserIds.forEach(identityId => this.missingUserQuarantine.delete(identityId));
    }

    const eligibleUserIds = uniqueUserIds.filter(identityId => !this.isAMissingUserWhichWasQuarantined(identityId));
    const res = await this.cache.getMany(eligibleUserIds);

    if (res.length !== eligibleUserIds.length) {
      const cachedUserIds = new Set(res.map(user => user.identityId));
      const tempUsers = eligibleUserIds.filter(id => !cachedUserIds.has(id));
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
   * Graph supports up to 20 individual requests in one JSON batch.
   * @param entityIds user identities to be fetched
   * @returns list of users
   */
  private async getUsersListFromB2C(entityIds: string[]): Promise<IdentityUserInfo[]> {
    if ((entityIds || []).length === 0) {
      return [];
    }
    await this.verifyAccessToken();

    const uniqueUserIds = [...new Set(entityIds)]; // Remove duplicated entries.
    const userIdsChunks: string[][] = [];

    for (let i = 0; i < uniqueUserIds.length; i += B2C_BATCH_SIZE) {
      userIdsChunks.push(uniqueUserIds.slice(i, i + B2C_BATCH_SIZE));
    }

    const usersList: IdentityUserInfo[] = [];

    for (let i = 0; i < userIdsChunks.length; i += B2C_MAX_CONCURRENT_BATCHES) {
      const currentChunks = userIdsChunks.slice(i, i + B2C_MAX_CONCURRENT_BATCHES);
      const results = await Promise.all(currentChunks.map(chunk => this.fetchUserBatchWithRetry(chunk)));
      usersList.push(...results.flat());
    }

    return usersList;
  }

  private async fetchUserBatchWithRetry(userIds: string[]): Promise<IdentityUserInfo[]> {
    let pendingUserIds = [...new Set(userIds)];
    const users: IdentityUserInfo[] = [];
    let retryCount = 0;

    while (pendingUserIds.length > 0) {
      const responses = await this.postB2CUserBatchWithRetry(pendingUserIds);
      const result = this.processB2CBatchResponses(pendingUserIds, responses);
      users.push(...result.users);

      if (result.retryUserIds.length === 0) {
        break;
      }

      if (retryCount >= B2C_MAX_RETRIES) {
        this.loggerService.error(
          `[B2C] Retriable batch subrequests exhausted; skipped identities: ${result.retryUserIds.join(', ')}`
        );
        break;
      }

      retryCount += 1;
      pendingUserIds = result.retryUserIds;
      const backoffMs = result.retryAfterMs ?? getExponentialBackoffMs(retryCount, B2C_MAX_BACKOFF_MS);
      this.loggerService.error(
        `[B2C] Retrying ${result.retryUserIds.length} batch subrequests in ${backoffMs}ms (attempt ${retryCount}/${B2C_MAX_RETRIES})`
      );
      await sleep(backoffMs);
    }

    return users;
  }

  private processB2CBatchResponses(userIds: string[], responses: B2CBatchSubResponse[]): B2CBatchProcessingResult {
    const responseById = new Map(responses.map(response => [response.id, response]));
    const users: IdentityUserInfo[] = [];
    const retryUserIds: string[] = [];
    let retryAfterMs: number | undefined;

    for (const identityId of userIds) {
      const response = responseById.get(identityId);
      if (!response) {
        retryUserIds.push(identityId);
        this.loggerService.error(`[B2C] Batch response missing for identity: ${identityId}`);
        continue;
      }

      if (response.status >= 200 && response.status < 300) {
        if (!response.body || !('id' in response.body) || response.body.id !== identityId) {
          retryUserIds.push(identityId);
          this.loggerService.error(`[B2C] Successful response had an invalid user body: ${identityId}`);
          continue;
        }

        users.push(...this.mapB2CUsersToDomain([response.body]));
        continue;
      }

      if (response.status === 404) {
        this.quarantineMissingUser(identityId);
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new B2CBatchRequestError(
          response.status,
          getRetryAfterMsFromHeaders(response.headers),
          false,
          `B2C rejected batch subrequest for ${identityId} with status ${response.status}`
        );
      }

      if (isRetryableHttpStatus(response.status)) {
        retryUserIds.push(identityId);
        const responseRetryAfterMs = getRetryAfterMsFromHeaders(response.headers);
        if (responseRetryAfterMs !== undefined) {
          retryAfterMs = Math.max(retryAfterMs ?? 0, responseRetryAfterMs);
        }
        continue;
      }

      this.loggerService.error(
        `[B2C] Permanent batch subrequest failure (status ${response.status}); skipped identity ${identityId}`,
        { body: response.body }
      );
    }

    return { retryAfterMs, retryUserIds, users };
  }

  private createB2CBatchRequests(userIds: string[]): B2CBatchRequest[] {
    return userIds.map(identityId => ({
      id: identityId,
      method: 'GET',
      url: `/users/${encodeURIComponent(identityId)}?$select=${B2C_BATCH_FIELDS.join(',')}`
    }));
  }

  private validateB2CBatchResponses(
    userIds: string[],
    responses: B2CBatchSubResponse[] | undefined
  ): B2CBatchSubResponse[] {
    if (
      !Array.isArray(responses) ||
      responses.some(response => !response || !response.id || typeof response.status !== 'number')
    ) {
      throw new B2CBatchRequestError(undefined, undefined, true, 'B2C batch response was invalid');
    }

    const expectedResponseIds = new Set(userIds);
    const responseIds = new Set(responses.map(response => response.id));
    if (
      responseIds.size !== expectedResponseIds.size ||
      [...expectedResponseIds].some(identityId => !responseIds.has(identityId)) ||
      [...responseIds].some(responseId => !expectedResponseIds.has(responseId))
    ) {
      throw new B2CBatchRequestError(undefined, undefined, true, 'B2C batch response was incomplete');
    }

    return responses;
  }

  private async postB2CUserBatch(userIds: string[]): Promise<B2CBatchSubResponse[]> {
    const response = await axios.post<B2CBatchResponseDTO>(
      'https://graph.microsoft.com/v1.0/$batch',
      { requests: this.createB2CBatchRequests(userIds) },
      {
        headers: { Authorization: `Bearer ${this.sessionData.token}` },
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new B2CBatchRequestError(
        response.status,
        getRetryAfterMsFromHeaders(response.headers),
        isRetryableHttpStatus(response.status),
        `B2C batch request failed with status ${response.status}`
      );
    }

    return this.validateB2CBatchResponses(userIds, response.data?.responses);
  }

  private toB2CBatchRequestError(error: unknown): B2CBatchRequestError {
    if (error instanceof B2CBatchRequestError) {
      return error;
    }

    const axiosError = axios.isAxiosError(error) ? error : undefined;
    const response = axiosError?.response;
    const status = response?.status;

    return new B2CBatchRequestError(
      status,
      getRetryAfterMsFromHeaders(response?.headers),
      !response || (status !== undefined && isRetryableHttpStatus(status)),
      axiosError?.message ?? 'B2C batch request failed'
    );
  }

  private async postB2CUserBatchWithRetry(userIds: string[]): Promise<B2CBatchSubResponse[]> {
    let retryCount = 0;

    while (true) {
      try {
        return await this.postB2CUserBatch(userIds);
      } catch (error: unknown) {
        const batchError = this.toB2CBatchRequestError(error);

        if (!batchError.retryable || retryCount >= B2C_MAX_RETRIES) {
          this.loggerService.error(
            `[B2C] Batch request failed; no more retries (status ${batchError.status ?? 'unknown'}): ${batchError.message}. Identities: ${userIds.join(', ')}`
          );
          throw batchError;
        }

        retryCount += 1;
        const backoffMs = batchError.retryAfterMs ?? getExponentialBackoffMs(retryCount, B2C_MAX_BACKOFF_MS);
        this.loggerService.error(
          `[B2C] Batch request retrying in ${backoffMs}ms (status ${batchError.status ?? 'unknown'}, attempt ${retryCount}/${B2C_MAX_RETRIES})`
        );
        await sleep(backoffMs);
      }
    }
  }

  private mapB2CUsersToDomain(b2cUsers: b2cGetUsersListDTO['value']): IdentityUserInfo[] {
    return b2cUsers.map(u => ({
      identityId: u.id,
      displayName: u.displayName,
      jobTitle: u.jobTitle,
      email: u.identities?.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId || '',
      mobilePhone: u.mobilePhone,
      isActive: u.accountEnabled,
      lastLoginAt: u.signInActivity?.lastSignInDateTime ? new Date(u.signInActivity.lastSignInDateTime) : null,
      passwordResetAt: u.lastPasswordChangeDateTime ? new Date(u.lastPasswordChangeDateTime) : null
    }));
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
          throw new ConflictError(UserErrorsEnum.USER_IDENTITY_CONFLICT, { message: 'Email already exists' });
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
