import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';
import type { DomainUserInfoType } from '@innovations/shared/types';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationSectionEnum } from '@innovations/shared/enums';

export const sectionsSubmittedSinceSupportStartStatisticsHandler = async (
  requestUser: DomainUserInfoType,
  data : { innovationId: string },
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSectionsSinceSupportStart(data.innovationId, requestUser)
  
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
