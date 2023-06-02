import { container } from '@notifications/shared/config/inversify.config';

import type { LoggerService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';
import { DispatchService } from '../_services/dispatch.service';
import { EmailService } from '../_services/email.service';
import { RecipientsService } from '../_services/recipients.service';
import SYMBOLS from '../_services/symbols';

// Specific inversify container configuration
container.bind<DispatchService>(SYMBOLS.DispatchService).to(DispatchService).inSingletonScope();
container.bind<EmailService>(SYMBOLS.EmailService).to(EmailService).inSingletonScope();
container.bind<RecipientsService>(SYMBOLS.RecipientsService).to(RecipientsService).inSingletonScope();

export { container };
export const startup = async (): Promise<void> => {
  const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);
  logger.log('Initializing Notifications app function');
};

void startup();
