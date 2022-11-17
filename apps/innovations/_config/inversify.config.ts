import { Container } from 'inversify';
import 'reflect-metadata';

import {
  AuthorizationService, AuthorizationServiceSymbol, AuthorizationServiceType,
  DomainService, DomainServiceSymbol, DomainServiceType,
  FileStorageService, FileStorageServiceSymbol, FileStorageServiceType, HttpService, HttpServiceSymbol, HttpServiceType, IdentityProviderService, IdentityProviderServiceSymbol, IdentityProviderServiceType,
  LoggerService, LoggerServiceSymbol, LoggerServiceType, NOSQLConnectionService, NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType, NotifierService, NotifierServiceSymbol, NotifierServiceType, SQLConnectionService, SQLConnectionServiceSymbol, SQLConnectionServiceType, StorageQueueService, StorageQueueServiceSymbol, StorageQueueServiceType
} from '@innovations/shared/services';

import { InnovationSectionsService } from '../_services/innovation-sections.service';
import { InnovationTransferService } from '../_services/innovation-transfer.service';
import { InnovationsService } from '../_services/innovations.service';

import { InnovationActionsServiceSymbol, InnovationActionsServiceType, InnovationAssessmentsServiceSymbol, InnovationAssessmentsServiceType, InnovationSectionsServiceSymbol, InnovationSectionsServiceType, InnovationsServiceSymbol, InnovationsServiceType, InnovationSupportsServiceSymbol, InnovationSupportsServiceType, InnovationThreadsServiceSymbol, InnovationThreadsServiceType, InnovationTransferServiceSymbol, InnovationTransferServiceType, PDFServiceSymbol, PDFServiceType, StatisticsServiceSymbol, StatisticsServiceType } from '../_services/interfaces';

import { InnovationActionsService } from '../_services/innovation-actions.service';
import { InnovationAssessmentsService } from '../_services/innovation-assessments.service';
import { InnovationSupportsService } from '../_services/innovation-supports.service';
import { InnovationThreadsService } from '../_services/innovation-threads.service';
import { startup } from './startup';
import { PDFService } from '../_services/pdf.service';
import { StatisticsService } from '../_services/statistics-service';


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

container.bind<InnovationActionsServiceType>(InnovationActionsServiceSymbol).to(InnovationActionsService).inSingletonScope();
container.bind<InnovationAssessmentsServiceType>(InnovationAssessmentsServiceSymbol).to(InnovationAssessmentsService).inSingletonScope();
container.bind<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol).to(InnovationSectionsService).inSingletonScope();
container.bind<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol).to(InnovationSupportsService).inSingletonScope();
container.bind<InnovationThreadsServiceType>(InnovationThreadsServiceSymbol).to(InnovationThreadsService).inSingletonScope();
container.bind<InnovationTransferServiceType>(InnovationTransferServiceSymbol).to(InnovationTransferService).inSingletonScope();
container.bind<InnovationsServiceType>(InnovationsServiceSymbol).to(InnovationsService).inSingletonScope();
container.bind<PDFServiceType>(PDFServiceSymbol).to(PDFService).inSingletonScope();
container.bind<StatisticsServiceType>(StatisticsServiceSymbol).to(StatisticsService).inSingletonScope();

void startup();
