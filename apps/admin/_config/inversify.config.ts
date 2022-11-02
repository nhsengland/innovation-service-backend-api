import 'reflect-metadata';
import { Container } from 'inversify';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType,
  NotifierServiceType, NotifierServiceSymbol, NotifierService,
  SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType,
  NOSQLConnectionServiceType, NOSQLConnectionServiceSymbol, NOSQLConnectionService,
  StorageQueueServiceType, StorageQueueServiceSymbol, StorageQueueService
} from '@admin/shared/services';

import { startup } from './startup';

export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).to(NOSQLConnectionService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();

startup();
