import { container } from '../../_config';
import type {
  InnovationStatisticsParamsTemplateType,
  InnovationStatisticsTemplateType
} from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';
import type { DomainContextType } from '@innovations/shared/types';

export class UnansweredSurveysByUnitStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.UNANSWERED_SURVEYS_BY_UNIT_COUNTER]
  ) {
    super(domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.UNANSWERED_SURVEYS_BY_UNIT_COUNTER]> {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const nSurveysUnansweredByUnit = await statisticsService.getUnansweredSurveysByUnitStatistics(
      this.domainContext,
      this.data.innovationId
    );

    return { count: nSurveysUnansweredByUnit };
  }
}
