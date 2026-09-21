import axios from 'axios';
import { injectable } from 'inversify';
import { Secret, sign } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

import { getRetryAfterMsFromHeaders, isRetryableHttpStatus } from '@notifications/shared/helpers';
import { EmailErrorsEnum, UnprocessableEntityError } from '@notifications/shared/errors';

import type { EmailTemplatesType } from '../_config';

import { EmailTemplates } from '../_config/emails.config';
import { NotifyDeliveryError } from '../_errors/notify-delivery.error';
import { BaseService } from './base.service';

type apiResponseDTO = {
  id: string;
  reference: string | null | undefined;
  uri: string;
  scheduled_for: string | null;
  content: { body: string; from_email: string; subject: string };
  template: { id: string; uri: string; version: number };
};

type apiClientParamsType<T> = {
  template_id: string;
  email_address: string;
  reference: string;
  personalisation: T;
};

@injectable()
export class EmailService extends BaseService {
  private accessToken: string;
  private apiIssuer = process.env['EMAIL_NOTIFICATION_API_ISSUER'] || '';
  private apiSecret: Secret = process.env['EMAIL_NOTIFICATION_API_SECRET'] || '';
  private apiBaseUrl = process.env['EMAIL_NOTIFICATION_API_BASE_URL'] || '';
  private apiEmailPath = process.env['EMAIL_NOTIFICATION_API_EMAIL_PATH'] || '';
  private nextNotifySendAt = 0;
  private notifyRateLimitTail: Promise<void> = Promise.resolve();
  private readonly notifyMinIntervalMs = 100;

  constructor() {
    super();

    // TODO: Log this better!
    if (!this.apiIssuer || !this.apiSecret) {
      this.logger.error('Invalid EMAIL API Issuer / Secret');
    }
  }

  /**
   * Generate a valid JSON Web token.
   *
   * Source: https://docs.notifications.service.gov.uk/rest-api.html
   *
   * JSON Web Tokens have a standard header and a payload. The header consists of:
   * { 'typ': 'JWT', 'alg': 'HS256' }
   *
   * The payload consists of:
   * { 'iss': '26785a09-ab16-4eb0-8407-a37497a57506', 'iat': 1568818578 }
   *
   * JSON Web Tokens are encoded using a secret key with the following format:
   * 3d844edf-8d35-48ac-975b-e847b4f122b0
   *
   * That secret key forms a part of your API key, which follows the format {key_name}-{iss-uuid}-{secret-key-uuid}
   * i.e.:
   * if your API key is my_test_key-26785a09-ab16-4eb0-8407-a37497a57506-3d844edf-8d35-48ac-975b-e847b4f122b0
   * then:
   * iss = 26785a09-ab16-4eb0-8407-a37497a57506
   * secret = 3d844edf-8d35-48ac-975b-e847b4f122b0
   */
  private generateAccessToken(): void {
    this.accessToken = sign({ iss: this.apiIssuer }, this.apiSecret, { algorithm: 'HS256' });
  }

  /**
   * Reserves the next Notify request slot for this service instance.
   * Requests are started at least `notifyMinIntervalMs` apart.
   *
   * @example
   * // With a 100 ms interval: at most 10 request starts per second.
   * await this.waitForNotifyRateLimit();
   */
  private async waitForNotifyRateLimit(): Promise<void> {
    const previous = this.notifyRateLimitTail;
    let release!: () => void;
    this.notifyRateLimitTail = new Promise(resolve => {
      release = resolve;
    });

    await previous;

    try {
      const delay = Math.max(0, this.nextNotifySendAt - Date.now());
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      this.nextNotifySendAt = Date.now() + this.notifyMinIntervalMs;
    } finally {
      release();
    }
  }

  async sendEmail<T extends keyof EmailTemplatesType>(
    template: T,
    toEmail: string,
    properties: EmailTemplatesType[T]
  ): Promise<boolean> {
    // Validate if the template exists.
    // const templateId = NotificationTemplates[templateCode].id;
    const templateId = EmailTemplates[template];
    if (!templateId) {
      throw new UnprocessableEntityError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND, {
        details: { templateId }
      });
    }

    this.generateAccessToken();

    const apiProperties: apiClientParamsType<EmailTemplatesType[T]> = {
      reference: uuid(),
      template_id: templateId,
      email_address: toEmail,
      personalisation: properties
    };

    await this.waitForNotifyRateLimit();
    await this.sendEmailNotifyNHS<T>(apiProperties, toEmail);

    return true;
  }

  private async sendEmailNotifyNHS<T extends keyof EmailTemplatesType>(
    apiProperties: apiClientParamsType<EmailTemplatesType[T]>,
    toEmail: string
  ): Promise<void> {
    try {
      const response = await axios.post<apiResponseDTO>(
        new URL(this.apiEmailPath, this.apiBaseUrl).toString(),
        apiProperties,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      this.logger.log(`Email sent`, {
        toEmail: toEmail,
        templateId: response.data.template.id,
        response: response.data
      });
    } catch (error: unknown) {
      throw this.toNotifyDeliveryError(error, toEmail);
    }
  }

  /** Converts an Axios/Notify failure into a retry-aware delivery error. */
  private toNotifyDeliveryError(error: unknown, toEmail: string): NotifyDeliveryError {
    const axiosError = axios.isAxiosError(error) ? error : undefined;
    const response = axiosError?.response;
    const status = response?.status;
    const responseData = response?.data as { errors?: { message?: string }[] } | undefined;
    const badAPIKey = responseData?.errors?.some(item =>
      item.message?.includes('send to this recipient using a team-only API key')
    );

    this.logger.error(
      badAPIKey
        ? `Error sending email to ${toEmail} due to bad api key (status ${status ?? 'unknown'})`
        : `Error sending email to ${toEmail} (status ${status ?? 'unknown'})`,
      { error }
    );

    return new NotifyDeliveryError(
      status,
      getRetryAfterMsFromHeaders(response?.headers),
      !badAPIKey && (status === undefined || isRetryableHttpStatus(status)),
      status ? `GOV Notify returned status ${status}` : 'GOV Notify request failed'
    );
  }
}
