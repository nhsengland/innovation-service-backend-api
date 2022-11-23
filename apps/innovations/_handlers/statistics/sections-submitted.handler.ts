import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationSectionEnum, UserTypeEnum } from '@innovations/shared/enums';
import { container } from '../../_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from '../../_services/interfaces';
import type { InnovationStatisticsTemplateType } from '../../_config/statistics.config';

export const sectionsSubmittedStatisticsHandler = async (
  _: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string; }
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]> => {
  
    const statisticsService = container.get<StatisticsServiceType>(StatisticsServiceSymbol);
  
    const submittedSections = await statisticsService.getSubmittedSections(data.innovationId);
    const totalSections = Object.keys(InnovationSectionEnum).length;
   
    const lastSubmittedSection = submittedSections.find(_ => true)?.updatedAt || null;
    
    return {
      count: submittedSections.length,
      total: totalSections,
      lastSubmittedAt: lastSubmittedSection,
    }
}
