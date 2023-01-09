import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationSectionEnum } from '@innovations/shared/enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import { InnovationsStatisticsHandler } from 'apps/innovations/_types/statistics-handlers.types';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';

export class SectionsSubmittedStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]) {
    super(requestUser, domainContext, data)
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]> {

    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSections(this.data.innovationId);
    const totalSections = Object.keys(InnovationSectionEnum).length;
   
    const lastSubmittedSection = submittedSections.find(_ => true);
    
    return {
      count: submittedSections.length,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null,
    }
  }
}
