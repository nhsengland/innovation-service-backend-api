import { inject, injectable } from 'inversify';
import axios, { AxiosResponse } from 'axios';

import { NotFoundError, ServiceUnavailableError, UnauthorizedError } from '../../config';
import { LoggerServiceSymbol, LoggerServiceType } from '../../interfaces/services.interfaces';
import { GenericErrorsEnum, UserErrorsEnum } from '../../enums/error.enums';


type b2cGetUserInfoDTO = {
  id: string;
  mail: string;
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  jobTitle: string;
  mobilePhone?: string;
  officeLocation: string;
  preferredLanguage: string;
  identities: {
    signInType: 'emailAddress' | 'userPrincipalName';
    issuer: string;
    issuerAssignedId: string;
  }[];
}

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
}

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
  }[];
}

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
  private sessionData: { token: string, expiresAt: number } = { token: '', expiresAt: 0 };


  constructor(
    @inject(LoggerServiceSymbol) private loggerService: LoggerServiceType
  ) { }


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

    const response = await axios.post<{ access_token: string, expires_in: number, ext_expires_in: number, token_type: 'Bearer' }>(
      `https://login.microsoftonline.com/${this.tenantName}.onmicrosoft.com/oauth2/v2.0/token`,
      this.encodeAuthData(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).catch(error => {
      this.loggerService.error('Error generating B2C access token', error);
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_IDENTIY_UNAVAILABLE, { details: error });
    });

    this.sessionData = { token: response.data.access_token, expiresAt: Date.now() + (response.data.expires_in * 1000) }; // Conversion to miliseconds needed.

  }

  private getError(status: number, message: string): Error {
    switch (status) {
      case 404:
        return new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      case 401:
        return new UnauthorizedError(GenericErrorsEnum.SERVICE_IDENTIY_UNAUTHORIZED);
      default:
        return new ServiceUnavailableError(GenericErrorsEnum.SERVICE_SQL_UNAVAILABLE, { details: { message } });
    }
  }


  async getUserInfo(identityId: string): Promise<{
    identityId: string,
    displayName: string,
    email: string,
    phone: null | string,
    passwordResetOn: null | string
  }> {

    await this.verifyAccessToken();

    const response = await axios.get<b2cGetUserInfoDTO>(
      `https://graph.microsoft.com/beta/users/${identityId}`,
      { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
    ).catch(error => {
      throw this.getError(error.response.status, error.response.data.message);
    });

    return {
      identityId: response.data.id,
      displayName: response.data.displayName,
      email: response.data.identities.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId || '',
      phone: response.data.mobilePhone ?? null,
      passwordResetOn: (response.data as any)[`extension_${this.tenantExtensionId}_passwordResetOn`] || null
    };

  }


  async getUserInfoByEmail(email: string): Promise<null | {
    identityId: string,
    displayName: string,
    email: string,
    phone: null | string,
  }> {

    await this.verifyAccessToken();

    const odataFilter = `$filter=identities/any(c:c/issuerAssignedId eq '${email}' and c/issuer eq '${this.tenantName}.onmicrosoft.com')`;

    const response = await axios.get<b2cGetUserInfoByEmailDTO>(
      `https://graph.microsoft.com/v1.0/users?${odataFilter}`,
      { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
    ).catch(error => {
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


  async getUsersList(entityIds: string[]): Promise<{ identityId: string, displayName: string, email: string, isActive: boolean }[]> {

    if ((entityIds || []).length === 0) { return []; }

    await this.verifyAccessToken();

    const uniqueUserIds = [...new Set(entityIds)]; // Remove duplicated entries.
    const chunkSize = 10; // B2C have a maximum limit of users that can be requested in 1 call.
    const promises: (Promise<AxiosResponse<b2cGetUsersListDTO>>)[] = [];

    // Prepare array, with array having (chuckSize) ids.
    const userIdsChunks = uniqueUserIds.reduce((acc: string[][], item, index) => {

      const chunkIndex = Math.floor(index / chunkSize);

      if (!acc[chunkIndex]) { acc.push([]); }

      acc[chunkIndex]?.push(item);

      return acc;

    }, []);

    // Prepare necessary requests.
    for (const userId of userIdsChunks) {

      const userIds = userId.map(item => `"${item}"`).join(',');
      const odataFilter = `$filter=id in (${userIds})`;

      promises.push(
        axios.get<b2cGetUsersListDTO>(
          `https://graph.microsoft.com/beta/users?${odataFilter}`,
          { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
        )
      );
    }

    // Make all calls and merge results.
    return (await Promise.all(promises)).flatMap(response =>
      response.data.value.map(u => ({
        identityId: u.id,
        displayName: u.displayName,
        email: u.identities.find(identity => identity.signInType === 'emailAddress')?.issuerAssignedId || '',
        isActive: u.accountEnabled
      }))
    );

  }


  async createUser(data: { name: string, email: string, password: string }): Promise<string> {

    await this.verifyAccessToken();

    const body = {
      accountEnabled: true,
      displayName: data.name,
      passwordPolicies: 'DisablePasswordExpiration',
      passwordProfile: { password: data.password, forceChangePasswordNextSignIn: false },
      identities: [{
        signInType: 'emailAddress',
        issuer: `${process.env['AD_TENANT_NAME']}.onmicrosoft.com`,
        issuerAssignedId: data.email,
      }],
      [`extension_${this.tenantExtensionId}_termsOfUseConsentVersion`]: 'V1',
      [`extension_${this.tenantExtensionId}_termsOfUseConsentChoice`]: 'AgreeToTermsOfUseConsentYes',
      [`extension_${this.tenantExtensionId}_termsOfUseConsentDateTime`]: new Date().toISOString(),
      [`extension_${this.tenantExtensionId}_passwordResetOn`]: new Date().toISOString()
    };

    const response = await axios.post<any>(
      'https://graph.microsoft.com/v1.0/users',
      body,
      { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
    ).catch(error => {
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_IDENTIY_UNAVAILABLE, { details: error });
    });

    return response.data.id;

  }


  async updateUser(identityId: string, body: { displayName?: string, mobilePhone?: string, accountEnabled?: boolean }): Promise<void> {

    await this.verifyAccessToken();

    // DOCS: https://docs.microsoft.com/pt-PT/graph/api/user-update?view=graph-rest-1.0&tabs=http
    // Response: 204 No Content, so we can return direcly.
    await axios.patch<undefined>(
      `https://graph.microsoft.com/v1.0/users/${identityId}`,
      body,
      { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
    ).catch(error => {
      throw this.getError(error.response.status, error.response.data.message);
    });

  }


  async deleteUser(identityId: string): Promise<void> {

    await this.verifyAccessToken();

    // DOCS: https://docs.microsoft.com/pt-PT/graph/api/user-delete?view=graph-rest-1.0&tabs=http
    // Response: 204 No Content, so we can return direcly.
    await axios.delete<undefined>(
      `https://graph.microsoft.com/v1.0/users/${identityId}`,
      { headers: { Authorization: `Bearer ${this.sessionData.token}` } }
    ).catch(error => {
      throw this.getError(error.response.status, error.response.data.message);
    });

  }

}
