import 'reflect-metadata';

import { Container } from 'inversify';

import type { DataSource } from 'typeorm';
import {
  AuthorizationService,
  AuthorizationServiceType,
  DomainService,
  DomainServiceType,
  FileStorageService,
  FileStorageServiceType,
  HttpService,
  HttpServiceType,
  IdentityProviderService,
  IdentityProviderServiceType,
  LoggerService,
  LoggerServiceType,
  NotifierService,
  NotifierServiceType,
  SQLConnectionService,
  SQLConnectionServiceType,
  StorageQueueService,
  StorageQueueServiceType
} from '../services';
import { AuditService } from '../services/integrations/audit.service';
import {
  AuditServiceSymbol,
  AuditServiceType,
  AuthorizationServiceSymbol,
  CacheServiceSymbol,
  CacheServiceType,
  DomainServiceSymbol,
  FileStorageServiceSymbol,
  HttpServiceSymbol,
  IdentityProviderServiceSymbol,
  LoggerServiceSymbol,
  NotifierServiceSymbol,
  SQLConnectionServiceSymbol,
  SQLProviderSymbol,
  StorageQueueServiceSymbol
} from '../services/interfaces';
import { CacheService } from '../services/storage/cache.service';
import { SqlProvider, sqlProvider } from '../services/storage/sql-connection.provider';

export const container: Container = new Container();

container.bind<SqlProvider>(SQLProviderSymbol).toProvider<DataSource>(sqlProvider);

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();
container
  .bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol)
  .to(IdentityProviderService)
  .inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();
container.bind<AuditServiceType>(AuditServiceSymbol).to(AuditService).inSingletonScope();
container.bind<CacheServiceType>(CacheServiceSymbol).to(CacheService).inSingletonScope();

// Initialize the services that depend on the SQL connection
const domainService = container.get<DomainServiceType>(DomainServiceSymbol);
domainService
  .sqlProvider()
  .then(connection => {
    console.log('DomainService INIT');
    domainService.setConnection(connection);
  })
  .catch(error => {
    console.log('SQLConnection ERROR', error);
    process.exit(1);
  });
const sqlService = container.get<SQLConnectionServiceType>(SQLConnectionServiceSymbol);
sqlService
  .sqlProvider()
  .then(connection => {
    console.log('SQLConnection INIT');
    sqlService.setConnection(connection);
  })
  .catch(error => {
    console.log('SQLConnection ERROR', error);
    process.exit(1);
  });
