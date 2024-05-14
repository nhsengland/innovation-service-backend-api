import 'reflect-metadata';

import { Container } from 'inversify';

import type { DataSource } from 'typeorm';

import { AuthorizationService } from '../services/auth/authorization.service';
import { DomainService } from '../services/domain/domain.service';
import { AuditService } from '../services/integrations/audit.service';
import { HttpService } from '../services/integrations/http.service';
import { IdentityProviderService } from '../services/integrations/identity-provider.service';
import { LoggerService } from '../services/integrations/logger.service';
import { NotifierService } from '../services/integrations/notifier.service';
import { StorageQueueService } from '../services/integrations/storage-queue.service';
import { CacheService } from '../services/storage/cache.service';
import { FileStorageService } from '../services/storage/file-storage.service';
import { SqlProvider, sqlProvider } from '../services/storage/sql-connection.provider';
import { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';
import { ElasticSearchService } from '../services/integrations/elastic-search.service';

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
container.bind<ElasticSearchService>(SHARED_SYMBOLS.ElasticSearchService).to(ElasticSearchService).inSingletonScope();

const logger = container.get<LoggerService>(SHARED_SYMBOLS.LoggerService);

// Initialize the services that depend on the SQL connection
const domainService = container.get<DomainService>(SHARED_SYMBOLS.DomainService);
domainService
  .sqlProvider()
  .then(connection => {
    logger.log('DomainService INIT');
    domainService.setConnection(connection);
  })
  .catch(error => {
    logger.log('SQLConnection ERROR', error);
    process.exit(1);
  });
const sqlService = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService);
sqlService
  .sqlProvider()
  .then(connection => {
    logger.log('SQLConnection INIT');
    sqlService.setConnection(connection);
  })
  .catch(error => {
    logger.log('SQLConnection ERROR', error);
    process.exit(1);
  });
