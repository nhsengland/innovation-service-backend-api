import 'reflect-metadata';

import { Container } from 'inversify';

import {
  AuthorizationService, AuthorizationServiceType, DomainService, DomainServiceType, FileStorageService, FileStorageServiceType, HttpService, HttpServiceType, IdentityProviderService,
  IdentityProviderServiceType, LoggerService, LoggerServiceType, NOSQLConnectionService, NOSQLConnectionServiceType, NotifierService, NotifierServiceType, SQLConnectionService,
  SQLConnectionServiceType, StorageQueueService, StorageQueueServiceType
} from '../services';
import { AuditService } from '../services/integrations/audit.service';
import {
  AuditServiceSymbol,
  AuditServiceType,
  AuthorizationServiceSymbol, CacheServiceSymbol, CacheServiceType, DomainServiceSymbol, FileStorageServiceSymbol, HttpServiceSymbol, IdentityProviderServiceSymbol, LoggerServiceSymbol, NOSQLConnectionServiceSymbol,
  NotifierServiceSymbol, SQLConnectionServiceSymbol, StorageQueueServiceSymbol
} from '../services/interfaces';
import { CacheService } from '../services/storage/cache.service';

export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).to(NOSQLConnectionService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();
container.bind<AuditServiceType>(AuditServiceSymbol).to(AuditService).inSingletonScope();
container.bind<CacheServiceType>(CacheServiceSymbol).to(CacheService).inSingletonScope();
