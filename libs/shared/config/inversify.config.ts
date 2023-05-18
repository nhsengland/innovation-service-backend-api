import 'reflect-metadata';

import { Container } from 'inversify';

import type { DataSource } from 'typeorm';
import {
  AuthorizationService,
  DomainService,
  FileStorageService,
  HttpService,
  IdentityProviderService,
  LoggerService,
  NotifierService,
  SQLConnectionService,
  StorageQueueService
} from '../services';
import { AuditService } from '../services/integrations/audit.service';
import { CacheService } from '../services/storage/cache.service';
import { SqlProvider, sqlProvider } from '../services/storage/sql-connection.provider';
import SHARED_SYMBOLS from '../services/symbols';

export const container: Container = new Container();

container.bind<SqlProvider>(SHARED_SYMBOLS.SqlProvider).toProvider<DataSource>(sqlProvider);

container.bind<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService).to(AuthorizationService).inSingletonScope();
container.bind<DomainService>(SHARED_SYMBOLS.DomainService).to(DomainService).inSingletonScope();
container.bind<FileStorageService>(SHARED_SYMBOLS.FileStorageService).to(FileStorageService).inSingletonScope();
container.bind<HttpService>(SHARED_SYMBOLS.HttpService).to(HttpService).inSingletonScope();
container
  .bind<IdentityProviderService>(SHARED_SYMBOLS.IdentityProviderService)
  .to(IdentityProviderService)
  .inSingletonScope();
container.bind<LoggerService>(SHARED_SYMBOLS.LoggerService).to(LoggerService).inSingletonScope();
container.bind<NotifierService>(SHARED_SYMBOLS.NotifierService).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).to(SQLConnectionService).inSingletonScope();
container.bind<StorageQueueService>(SHARED_SYMBOLS.StorageQueueService).to(StorageQueueService).inSingletonScope();
container.bind<AuditService>(SHARED_SYMBOLS.AuditService).to(AuditService).inSingletonScope();
container.bind<CacheService>(SHARED_SYMBOLS.CacheService).to(CacheService).inSingletonScope();

// Initialize the services that depend on the SQL connection
const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
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
const sqlService = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService);
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
