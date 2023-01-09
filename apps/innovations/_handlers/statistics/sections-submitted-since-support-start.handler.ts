import { InnovationSectionEnum } from '@innovations/shared/enums';
import type { DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { StatisticsServiceSymbol, type StatisticsServiceType } from '../../_services/interfaces';

export const sectionsSubmittedSinceSupportStartStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  data : { innovationId: string },
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSectionsSinceSupportStart(data.innovationId, requestUser)
  
    const sections = submittedSections;
    const totalSections = Object.keys(InnovationSectionEnum).length;
    const lastSubmittedSection = sections.find(_ => true);

    return {
      count: sections.length,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null,
    }
}
