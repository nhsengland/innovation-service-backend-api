import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import { InnovationSectionEnum, UserTypeEnum } from '@innovations/shared/enums';
import { container } from 'apps/innovations/_config';
import { type StatisticsServiceType, StatisticsServiceSymbol } from 'apps/innovations/_services/interfaces';
import type { InnovationStatisticsTemplateType } from 'apps/innovations/_config/statistics.config';

export const sectionsSubmittedStatisticsHandler = async (
  _: { id: string, identityId: string, type: UserTypeEnum },
  data: { innovationId: string; }
): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]> => {
  
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
