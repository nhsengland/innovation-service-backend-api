import { container } from '@users/shared/config/inversify.config';

import { AnnouncementsService } from '../_services/announcements.service';
import { NotificationsService } from '../_services/notifications.service';
import { OrganisationsService } from '../_services/organisations.service';
import { StatisticsService } from '../_services/statistics.service';
import { SYMBOLS } from '../_services/symbols';
import { TermsOfUseService } from '../_services/terms-of-use.service';
import { UsersService } from '../_services/users.service';

// Specific inversify container configuration.
container
  .bind<OrganisationsService>(SYMBOLS.OrganisationsService)
  .to(OrganisationsService)
  .inSingletonScope();
container
  .bind<TermsOfUseService>(SYMBOLS.TermsOfUseService)
  .to(TermsOfUseService)
  .inSingletonScope();
container.bind<UsersService>(SYMBOLS.UsersService).to(UsersService).inSingletonScope();
container
  .bind<NotificationsService>(SYMBOLS.NotificationsService)
  .to(NotificationsService)
  .inSingletonScope();
container
  .bind<StatisticsService>(SYMBOLS.StatisticsService)
  .to(StatisticsService)
  .inSingletonScope();
container
  .bind<AnnouncementsService>(SYMBOLS.AnnouncementsService)
  .to(AnnouncementsService)
  .inSingletonScope();

export { container };
