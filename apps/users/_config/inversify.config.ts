import { Container } from 'inversify';
import 'reflect-metadata';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType,
  HttpService, HttpServiceSymbol, HttpServiceType,
  IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType, NOSQLConnectionService, NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType, NotifierService, NotifierServiceSymbol, NotifierServiceType, SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType, StorageQueueService, StorageQueueServiceSymbol, StorageQueueServiceType
} from '@users/shared/services';

import {
  NotificationsServiceSymbol,
  NotificationsServiceType,
  OrganisationsServiceSymbol, OrganisationsServiceType,
  SurveyServiceSymbol, SurveyServiceType,
  TermsOfUseServiceSymbol, TermsOfUseServiceType,
  UsersServiceSymbol, UsersServiceType
} from '../_services/interfaces';
import { OrganisationsService } from '../_services/organisations.service';
import { SurveyService } from '../_services/survey.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';

import { NotificationsService } from '../_services/notifications.service';
import { startup } from './startup';

export const container: Container = new Container();

container.bind<AuthorizationServiceType>(AuthorizationServiceSymbol).to(AuthorizationService).inSingletonScope();
container.bind<DomainServiceType>(DomainServiceSymbol).to(DomainService).inSingletonScope();
container.bind<FileStorageServiceType>(FileStorageServiceSymbol).to(FileStorageService).inSingletonScope();
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();
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
container.bind<NotificationsServiceType>(NotificationsServiceSymbol).to(NotificationsService).inSingletonScope();

void startup();
