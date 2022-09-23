import type { AuthorizationService } from '../services/auth/authorization.service';

import type { DomainService } from '../services/domain/domain.service';

import type { HttpService } from '../services/integrations/http.service';
import type { IdentityProviderService } from '../services/integrations/identity-provider.service';
import type { LoggerService } from '../services/integrations/logger.service';
import type { NotifierService } from '../services/integrations/notifier.service';
import type { StorageQueueService } from '../services/integrations/storage-queue.service';

import type { FileStorageService } from '../services/storage/file-storage.service';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import type { NOSQLConnectionService } from '../services/storage/nosql-connection.service';


export type AuthorizationServiceType = typeof AuthorizationService.prototype;
export const AuthorizationServiceSymbol = Symbol('AuthorizationService');


export type DomainServiceType = typeof DomainService.prototype;
export const DomainServiceSymbol = Symbol('DomainService');


export type HttpServiceType = typeof HttpService.prototype;
export const HttpServiceSymbol = Symbol('HttpService');

export type IdentityProviderServiceType = typeof IdentityProviderService.prototype;
export const IdentityProviderServiceSymbol = Symbol('IdentityProviderService');

export type LoggerServiceType = typeof LoggerService.prototype;
export const LoggerServiceSymbol = Symbol('LoggerService');

export type NotifierServiceType = typeof NotifierService.prototype;
export const NotifierServiceSymbol = Symbol('NotifierService');

export type StorageQueueServiceType = typeof StorageQueueService.prototype;
export const StorageQueueServiceSymbol = Symbol('StorageQueueService');


export type FileStorageServiceType = typeof FileStorageService.prototype;
export const FileStorageServiceSymbol = Symbol('FileStorageService');

export type SQLConnectionServiceType = typeof SQLConnectionService.prototype;
export const SQLConnectionServiceSymbol = Symbol('SQLConnectionService');

export type NOSQLConnectionServiceType = typeof NOSQLConnectionService.prototype;
export const NOSQLConnectionServiceSymbol = Symbol('NOSQLConnectionService');
