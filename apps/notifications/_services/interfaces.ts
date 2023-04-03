import type { DispatchService } from './dispatch.service';
import type { EmailService } from './email.service';
import type { RecipientsService } from './recipients.service';


export type DispatchServiceType = typeof DispatchService.prototype;
export const DispatchServiceSymbol = Symbol.for('DispatchService');

export type EmailServiceType = typeof EmailService.prototype;
export const EmailServiceSymbol = Symbol.for('EmailService');

export type RecipientsServiceType = typeof RecipientsService.prototype;
export const RecipientsServiceSymbol = Symbol.for('RecipientsService');
