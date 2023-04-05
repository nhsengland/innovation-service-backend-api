import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type { InnovationStatisticsParamsTemplateType, InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, type StatisticsServiceType } from '../../_services/interfaces';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class SectionsSubmittedStatisticsHandler extends InnovationsStatisticsHandler {

  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]) {
    super(requestUser, domainContext, data);
  }

  async run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]> {

    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSections(this.data.innovationId);
    const totalSections = CurrentCatalogTypes.InnovationSections.length;
   
    const lastSubmittedSection = submittedSections.find(_ => true);
    
    return {
      count: submittedSections.length,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null,
    };
  }
}
