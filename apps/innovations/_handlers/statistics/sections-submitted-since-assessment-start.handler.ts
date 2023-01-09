import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationsStatisticsHandler } from 'apps/innovations/_types/statistics-handlers.types';
import { InnovationSectionEnum } from '@innovations/shared/enums';

export class SectionsSubmittedSinceAssessmentStartStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]) {
    super(requestUser, domainContext, data)
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]> {
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSectionsSinceAssessmentStart(this.data.innovationId, this.requestUser)
  
    const [sections, count] = submittedSections;
    const totalSections = Object.keys(InnovationSectionEnum).length;
    const lastSubmittedSection = sections.find(_ => true);
  
    return {
      count,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null,
    }
  }
}
