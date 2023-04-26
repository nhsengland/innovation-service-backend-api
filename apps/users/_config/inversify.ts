import { container } from '@users/shared/config/inversify.config';

import {
  AnnouncementsServiceSymbol,
  AnnouncementsServiceType,
  NotificationsServiceSymbol,
  NotificationsServiceType,
  OrganisationsServiceSymbol,
  OrganisationsServiceType,
  StatisticsServiceSymbol,
  StatisticsServiceType,
  TermsOfUseServiceSymbol,
  TermsOfUseServiceType,
  UsersServiceSymbol,
  UsersServiceType,
} from '../_services/interfaces';

import { AnnouncementsService } from '../_services/announcements.service';
import { NotificationsService } from '../_services/notifications.service';
import { OrganisationsService } from '../_services/organisations.service';
import { StatisticsService } from '../_services/statistics.service';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';

// Specific inversify container configuration.
container
  .bind<OrganisationsServiceType>(OrganisationsServiceSymbol)
  .to(OrganisationsService)
  .inSingletonScope();
container
  .bind<TermsOfUseServiceType>(TermsOfUseServiceSymbol)
  .to(TermsOfUseService)
  .inSingletonScope();
container.bind<UsersServiceType>(UsersServiceSymbol).to(UsersService).inSingletonScope();
container
  .bind<NotificationsServiceType>(NotificationsServiceSymbol)
  .to(NotificationsService)
  .inSingletonScope();
container
  .bind<StatisticsServiceType>(StatisticsServiceSymbol)
  .to(StatisticsService)
  .inSingletonScope();
container
  .bind<AnnouncementsServiceType>(AnnouncementsServiceSymbol)
  .to(AnnouncementsService)
  .inSingletonScope();

export { container };
