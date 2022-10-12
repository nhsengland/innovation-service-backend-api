import 'reflect-metadata';
import { Container } from 'inversify';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  HttpService, HttpServiceSymbol, HttpServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType,
  SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType,
  NOSQLConnectionServiceType, NOSQLConnectionServiceSymbol, NOSQLConnectionService, NotifierServiceType, NotifierServiceSymbol, NotifierService, StorageQueueServiceType, StorageQueueServiceSymbol, StorageQueueService, DomainUsersServiceType, DomainUsersServiceSymbol, DomainInnovationsServiceType, DomainInnovationsServiceSymbol
} from '@innovations/shared/services';

import { InnovationsService } from '../_services/innovations.service';
import {
  InnovationsServiceSymbol, InnovationsServiceType, InnovationTransferServiceSymbol, InnovationTransferServiceType,
} from '../_services/interfaces';

import { startup } from './startup';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { DomainUsersService } from '@innovations/shared/services/domain/domain-users.service';
import { DomainInnovationsService } from '@innovations/shared/services/domain/domain-innovations.service';


export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainUsersServiceType>(DomainUsersServiceSymbol).to(DomainUsersService).inSingletonScope();
container.bind<DomainInnovationsServiceType>(DomainInnovationsServiceSymbol).to(DomainInnovationsService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).to(NOSQLConnectionService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();
container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<InnovationTransferServiceType>(InnovationTransferServiceSymbol).to(InnovationTransferService).inSingletonScope();

startup();
