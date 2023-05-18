import { container } from '@notifications/shared/config/inversify.config';

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
  console.log('Initializing Notifications app function');

  try {
    console.log('Initialization complete');
  } catch (error) {
    // TODO: Treat this error! Should we end the process?
    console.error('Notifications app function was UNABLE to start');
    console.error(error);
  }
};

void startup();
