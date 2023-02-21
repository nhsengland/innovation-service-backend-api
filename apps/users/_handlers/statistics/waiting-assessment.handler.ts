import type { UserStatisticsEnum } from '../../_enums/user.enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { UserStatisticsTemplateType } from '../../_config/statistics.config';

export const waitingAssessmentStatisticsHandler = async (): Promise<UserStatisticsTemplateType[UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER]> => {

  const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);

  const actions = await statisticsService.waitingAssessment();

  return {
    count: actions.count,
    overdue: actions.overdue,
  };

}
