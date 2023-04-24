import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, type StatisticsServiceType } from '../../_services/interfaces';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class SectionsSubmittedSinceAssessmentStartStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]) {
    super(requestUser, domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]> {
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSectionsSinceAssessmentStart(this.data.innovationId, this.requestUser);
  
    const sections = submittedSections;
    const totalSections = CurrentCatalogTypes.InnovationSections.length;
    const lastSubmittedSection = sections.find(_ => true);
  
    return {
      count: sections.length,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null,
    };
  }
}
