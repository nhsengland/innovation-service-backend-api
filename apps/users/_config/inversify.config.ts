import 'reflect-metadata';
import { Container } from 'inversify';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  HttpService, HttpServiceSymbol, HttpServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType,
  NOSQLConnectionService, NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType,
} from '@users/shared/services';

import { InnovationsService } from '../_services/innovations.service';
import { OrganisationsService } from '../_services/organisations.service';
import { UsersService } from '../_services/users.service';
import {
  InnovationsServiceSymbol, InnovationsServiceType,
  OrganisationsServiceSymbol, OrganisationsServiceType,
  UsersServiceSymbol, UsersServiceType
} from '../_interfaces/services.interfaces';

import { startup } from './startup';

export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).to(NOSQLConnectionService).inSingletonScope();

container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();

startup();