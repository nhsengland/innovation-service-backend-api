import type { DispatchService } from './dispatch.service';
import type { EmailService } from './email.service';
import type { RecipientsService } from './recipients.service';


export type DispatchServiceType = typeof DispatchService.prototype;
export const DispatchServiceSymbol = Symbol('DispatchService');

export type EmailServiceType = typeof EmailService.prototype;
export const EmailServiceSymbol = Symbol('EmailService');

export type RecipientsServiceType = typeof RecipientsService.prototype;
export const RecipientsServiceSymbol = Symbol('RecipientsService');
