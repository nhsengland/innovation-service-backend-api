import { container } from '../../_config';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';
import type { UserStatisticsEnum } from '../../_enums/user.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';

export const waitingAssessmentStatisticsHandler = async (): Promise<
  UserStatisticsTemplateType[UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER]
> => {
  const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

  const actions = await statisticsService.waitingAssessment();

  return {
    count: actions.count,
    overdue: actions.overdue
  };
};
