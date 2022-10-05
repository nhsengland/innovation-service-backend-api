import { injectable } from 'inversify';
import { Secret, sign } from 'jsonwebtoken';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

import { ServiceUnavailableError, UnprocessableEntityError, EmailErrorsEnum, GenericErrorsEnum } from '@notifications/shared/errors';

import type { NotificationLogTypeEnum } from '@notifications/shared/enums/notification.enums';

import type { EmailTemplatesType, EmailTypeEnum } from '../_config';

import { BaseService } from './base.service';
import { NotificationLogEntity } from '@notifications/shared/entities/user/notification-log.entity';


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
  // emailReplyToId?: string;
};


@injectable()
export class EmailService extends BaseService {

  private accessToken: string;
  private apiIssuer = process.env['EMAIL_NOTIFICATION_API_ISSUER'] || '';
  private apiSecret: Secret = process.env['EMAIL_NOTIFICATION_API_SECRET'] || '';
  private apiBaseUrl = process.env['EMAIL_NOTIFICATION_API_BASE_URL'] || '';
  private apiEmailPath = process.env['EMAIL_NOTIFICATION_API_EMAIL_PATH'] || '';

  constructor(
  ) {

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


  async sendEmail<T extends EmailTypeEnum>(
    templateId: T,
    toEmail: string,
    properties: EmailTemplatesType[T],
    log?: {
      type: NotificationLogTypeEnum,
      params: Record<string, string | number>,
    }
  ): Promise<boolean> {

    // Validate if the template exists.
    // const templateId = NotificationTemplates[templateCode].id;
    if (!templateId) {
      throw new UnprocessableEntityError(EmailErrorsEnum.EMAIL_TEMPLATE_NOT_FOUND, { details: { templateId } });
    }

    this.generateAccessToken();

    const apiProperties: apiClientParamsType<EmailTemplatesType[T]> = {
      reference: uuid(),
      template_id: templateId,
      email_address: toEmail,
      personalisation: properties
    };

    await this.sendEmailNotifyNHS<T>(apiProperties, toEmail);

    if (log) {
      

      const logDbQuery = this.sqlConnection.createQueryBuilder(NotificationLogEntity, 'notificationLog')
      .where(`notificationLog.notification_type = '${log.type}' and notificationLog.params = '${JSON.stringify(log.params)}' and FORMAT(notificationLog.created_at, 'yyyyMMdd') = '${new Date().toLocaleDateString('sv').replace(/-/g, '')}'`)
      
      const logDb = await logDbQuery.getOne();

      if (!logDb) {

        const notificationLogEntity = NotificationLogEntity.new({
          notificationType: log.type,
          notificationParams: log.params,
        });

        try {
          await this.sqlConnection.manager.insert(NotificationLogEntity, notificationLogEntity);
        } catch (error) {
          this.logger.error(`Failed to create Notification Log for type ${log.type}`, { error, params: log.params })
        }
      }
    }

    return true;
  }


  private async sendEmailNotifyNHS<T extends EmailTypeEnum>(apiProperties: apiClientParamsType<EmailTemplatesType[T]>, toEmail: string) {
    const response = await axios.post<apiResponseDTO>(
      new URL(this.apiEmailPath, this.apiBaseUrl).toString(),
      apiProperties,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    ).catch((error) => {
      this.logger.error(`Error sending email to ${toEmail}`, { error });
      throw new ServiceUnavailableError(GenericErrorsEnum.SERVICE_EMAIL_UNAVAILABLE);
    });

    this.logger.log(`Email sent`, {
      toEmail: toEmail,
      templateId: response.data.template.id,
      response: response.data
    });
  }
}
