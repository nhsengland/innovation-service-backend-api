import 'reflect-metadata';
import { Container } from 'inversify';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType,
  NotifierServiceType, NotifierServiceSymbol, NotifierService,
  SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType,
  NOSQLConnectionServiceType, NOSQLConnectionServiceSymbol, NOSQLConnectionService,
  StorageQueueServiceType, StorageQueueServiceSymbol, StorageQueueService
} from '@users/shared/services';

import { OrganisationsService } from '../_services/organisations.service';
import { SurveyService } from '../_services/survey.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';
import {
  OrganisationsServiceSymbol, OrganisationsServiceType,
  SurveyServiceSymbol, SurveyServiceType,
  TermsOfUseServiceSymbol, TermsOfUseServiceType,
  UsersServiceSymbol, UsersServiceType
} from '../_services/interfaces';

import { startup } from './startup';

export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<IdentityProviderServiceType>(IdentityProviderServiceSymbol).to(IdentityProviderService).inSingletonScope();
container.bind<LoggerServiceType>(LoggerServiceSymbol).to(LoggerService).inSingletonScope();
container.bind<NotifierServiceType>(NotifierServiceSymbol).to(NotifierService).inSingletonScope();
container.bind<SQLConnectionServiceType>(SQLConnectionServiceSymbol).to(SQLConnectionService).inSingletonScope();
container.bind<NOSQLConnectionServiceType>(NOSQLConnectionServiceSymbol).to(NOSQLConnectionService).inSingletonScope();
container.bind<StorageQueueServiceType>(StorageQueueServiceSymbol).to(StorageQueueService).inSingletonScope();

container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<SurveyServiceType>(SurveyServiceSymbol).to(SurveyService).inSingletonScope();
container.bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol).to(TermsOfUseService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();

startup();
