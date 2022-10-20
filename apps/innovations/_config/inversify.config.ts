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
  StorageQueueServiceType, StorageQueueServiceSymbol, StorageQueueService, HttpServiceType, HttpServiceSymbol, HttpService
} from '@innovations/shared/services';

import { InnovationsService } from '../_services/innovations.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationSectionsService } from '../_services/innovation-sections.service';

import {
  InnovationsServiceSymbol, InnovationsServiceType,
  InnovationTransferServiceSymbol, InnovationTransferServiceType,
  InnovationSectionsServiceSymbol, InnovationSectionsServiceType, InnovationAssessmentsServiceType, InnovationAssessmentsServiceSymbol, InnovationThreadsServiceType, InnovationThreadsServiceSymbol, InnovationSupportsServiceType, InnovationSupportsServiceSymbol, InnovationActionServiceType, InnovationActionServiceSymbol,
} from '../_services/interfaces';

import { startup } from './startup';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationActionService } from '../_services/innovation-action.service';


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
container.bind<HttpServiceType>(HttpServiceSymbol).to(HttpService).inSingletonScope();

container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<InnovationTransferServiceType>(InnovationTransferServiceSymbol).to(InnovationTransferService).inSingletonScope();
container.bind<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol).to(InnovationSectionsService).inSingletonScope();
container.bind<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol).to(InnovationAssessmentsService).inSingletonScope();
container.bind<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol).to(InnovationThreadsService).inSingletonScope();
container.bind<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol).to(InnovationSupportsService).inSingletonScope();
container.bind<InnovationActionServiceType>(InnovationActionServiceSymbol).to(InnovationActionService).inSingletonScope();

startup();
