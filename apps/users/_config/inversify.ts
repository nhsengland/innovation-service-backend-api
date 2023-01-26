import { container } from '@users/shared/config/inversify.config';

import {
  NotificationsServiceSymbol,
  NotificationsServiceType,
  OrganisationsServiceSymbol, OrganisationsServiceType,
  StatisticsServiceSymbol,
  StatisticsServiceType,
  SurveyServiceSymbol, SurveyServiceType,
  TermsOfUseServiceSymbol, TermsOfUseServiceType,
  UsersServiceSymbol, UsersServiceType
} from '../_services/interfaces';
import { OrganisationsService } from '../_services/organisations.service';
import { SurveyService } from '../_services/survey.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';

import { NotificationsService } from '../_services/notifications.service';
import { StatisticsService } from '../_services/statistics.service';


// Specific inversify container configuration
container.bind<OrganisationsServiceType>(OrganisationsServiceSymbol).to(OrganisationsService).inSingletonScope();
container.bind<SurveyServiceType>(SurveyServiceSymbol).to(SurveyService).inSingletonScope();
container.bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol).to(TermsOfUseService).inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();
container.bind<NotificationsServiceType>(NotificationsServiceSymbol).to(NotificationsService).inSingletonScope();
container.bind<StatisticsServiceType>(StatisticsServiceSymbol).to(StatisticsService).inSingletonScope();

export { container };