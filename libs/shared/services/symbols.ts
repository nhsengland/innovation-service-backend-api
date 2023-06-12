export const SHARED_SYMBOLS = {
  AuditService: Symbol.for('AuditService'),
  AuthorizationService: Symbol.for('AuthorizationService'),
  CacheService: Symbol.for('CacheService'),
  DomainService: Symbol.for('DomainService'),
  HttpService: Symbol.for('HttpService'),
  IdentityProviderService: Symbol.for('IdentityProviderService'),
  LoggerService: Symbol.for('LoggerService'),
  NotifierService: Symbol.for('NotifierService'),
  StorageQueueService: Symbol.for('StorageQueueService'),
  FileStorageService: Symbol.for('FileStorageService'),
  SQLConnectionService: Symbol.for('SQLConnectionService'),
  SqlProvider: Symbol.for('SqlProvider')
};

export default SHARED_SYMBOLS;
