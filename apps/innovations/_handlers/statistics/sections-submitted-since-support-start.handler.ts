import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import { container } from '../../_config';
import type {
  InnovationStatisticsParamsTemplateType,
  InnovationStatisticsTemplateType
} from '../../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../../_enums/innovation.enums';
import type { StatisticsService } from '../../_services/statistics.service';
import SYMBOLS from '../../_services/symbols';
import { InnovationsStatisticsHandler } from '../../_types/statistics-handlers.types';

export class SectionsSubmittedSinceSupportStartStatisticsHandler extends InnovationsStatisticsHandler {
  constructor(
    requestUser: DomainUserInfoType,
    domainContext: DomainContextType,
    data: InnovationStatisticsParamsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]
  ) {
    super(requestUser, domainContext, data);
  }

  async run(): Promise<
    InnovationStatisticsTemplateType[InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]
  > {
    const statisticsService = container.get<StatisticsService>(SYMBOLS.StatisticsService);

    const submittedSections = await statisticsService.getSubmittedSectionsSinceSupportStart(
      this.data.innovationId,
      this.domainContext
    );

    const sections = submittedSections;
    const totalSections = CurrentCatalogTypes.InnovationSections.length;
    const lastSubmittedSection = sections.find(_ => true);

    return {
      count: sections.length,
      total: totalSections,
      lastSubmittedSection: lastSubmittedSection?.section || null,
      lastSubmittedAt: lastSubmittedSection?.updatedAt || null
    };
  }
}
