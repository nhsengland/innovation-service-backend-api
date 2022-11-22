import { Container } from 'inversify';
import 'reflect-metadata';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType,
  NotifierService, NotifierServiceSymbol, NotifierServiceType,
  SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType,
  StorageQueueService, StorageQueueServiceSymbol, StorageQueueServiceType
} from '@notifications/shared/services';

import { DispatchService } from '../_services/dispatch.service';
import { EmailService } from '../_services/email.service';
import {
  DispatchServiceSymbol, DispatchServiceType,
  EmailServiceSymbol, EmailServiceType,
  RecipientsServiceSymbol, RecipientsServiceType
} from '../_services/interfaces';
import { RecipientsService } from '../_services/recipients.service';

import { startup } from './startup';


export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();

container.bind<DispatchServiceType>(DispatchServiceSymbol).to(DispatchService).inSingletonScope();
container.bind<EmailServiceType>(EmailServiceSymbol).to(EmailService).inSingletonScope();
container.bind<RecipientsServiceType>(RecipientsServiceSymbol).to(RecipientsService).inSingletonScope();

void startup();
