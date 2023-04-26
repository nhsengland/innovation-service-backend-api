import type { AuthorizationService } from '../services/auth/authorization.service';

import type { DomainService } from '../services/domain/domain.service';

import type { AuditService } from '../services/integrations/audit.service';
import type { HttpService } from '../services/integrations/http.service';
import type { IdentityProviderService } from '../services/integrations/identity-provider.service';
import type { LoggerService } from '../services/integrations/logger.service';
import type { NotifierService } from '../services/integrations/notifier.service';
import type { StorageQueueService } from '../services/integrations/storage-queue.service';

import type { FileStorageService } from '../services/storage/file-storage.service';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import type { CacheService } from './storage/cache.service';
import type { SqlProvider } from './storage/sql-connection.provider';

export type AuditServiceType = typeof AuditService.prototype;
export const AuditServiceSymbol = Symbol.for('AuditService');

export type AuthorizationServiceType = typeof AuthorizationService.prototype;
export const AuthorizationServiceSymbol = Symbol.for('AuthorizationService');

export type CacheServiceType = typeof CacheService.prototype;
export const CacheServiceSymbol = Symbol.for('CacheService');

export type DomainServiceType = typeof DomainService.prototype;
export const DomainServiceSymbol = Symbol.for('DomainService');


export type HttpServiceType = typeof HttpService.prototype;
export const HttpServiceSymbol = Symbol.for('HttpService');

export type IdentityProviderServiceType = typeof IdentityProviderService.prototype;
export const IdentityProviderServiceSymbol = Symbol.for('IdentityProviderService');

export type LoggerServiceType = typeof LoggerService.prototype;
export const LoggerServiceSymbol = Symbol.for('LoggerService');

export type NotifierServiceType = typeof NotifierService.prototype;
export const NotifierServiceSymbol = Symbol.for('NotifierService');

export type StorageQueueServiceType = typeof StorageQueueService.prototype;
export const StorageQueueServiceSymbol = Symbol.for('StorageQueueService');

export type FileStorageServiceType = typeof FileStorageService.prototype;
export const FileStorageServiceSymbol = Symbol.for('FileStorageService');

export type SQLConnectionServiceType = typeof SQLConnectionService.prototype;
export const SQLConnectionServiceSymbol = Symbol.for('SQLConnectionService');

export type SQLProviderType = SqlProvider;
export const SQLProviderSymbol = Symbol.for('SqlProvider');
