import { container } from '@notifications/shared/config/inversify.config';

import { SQLConnectionServiceSymbol, SQLConnectionServiceType } from '@notifications/shared/services';

import { DispatchService } from '../_services/dispatch.service';
import { EmailService } from '../_services/email.service';
import {
  DispatchServiceSymbol, DispatchServiceType,
  EmailServiceSymbol, EmailServiceType,
  RecipientsServiceSymbol, RecipientsServiceType
} from '../_services/interfaces';
import { RecipientsService } from '../_services/recipients.service';

// Specific inversify container configuration
container.bind<DispatchServiceType>(DispatchServiceSymbol).to(DispatchService).inSingletonScope();
container.bind<EmailServiceType>(EmailServiceSymbol).to(EmailService).inSingletonScope();
container.bind<RecipientsServiceType>(RecipientsServiceSymbol).to(RecipientsService).inSingletonScope();

export { container };
export const startup = async (): Promise<void> => {

  console.log('Initializing Notifications app function');

  const sqlConnectionService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);

  try {

    await sqlConnectionService.init();

    console.log('Initialization complete');

  } catch (error) {

    // TODO: Treat this error! Should we end the process?
    console.error('Notifications app function was UNABLE to start');
    console.error(error);

  }

}

void startup()