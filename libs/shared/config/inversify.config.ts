import 'reflect-metadata';

import { Container } from 'inversify';

import { AuthorizationService } from '../services/auth/authorization.service';
import { DomainService } from '../services/domain/domain.service';
import { AuditService } from '../services/integrations/audit.service';
import { ElasticSearchService } from '../services/integrations/elastic-search.service';
import { HttpService } from '../services/integrations/http.service';
import { IdentityProviderService } from '../services/integrations/identity-provider.service';
import { LoggerService } from '../services/integrations/logger.service';
import { NotifierService } from '../services/integrations/notifier.service';
import { StorageQueueService } from '../services/integrations/storage-queue.service';
import { CacheService } from '../services/storage/cache.service';
import { FileStorageService } from '../services/storage/file-storage.service';
import { IRSchemaService } from '../services/storage/ir-schema.service';
import { RedisService } from '../services/storage/redis.service';
import { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';

export const container: Container = new Container();

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
container.bind<RedisService>(SHARED_SYMBOLS.RedisService).to(RedisService).inSingletonScope();
container.bind<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService).to(IRSchemaService).inSingletonScope();
