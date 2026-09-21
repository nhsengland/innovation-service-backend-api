import type { DomainContextType } from '@innovations/shared/types';
import type { InnovationStatisticsTemplateType } from '../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';

export abstract class InnovationsStatisticsHandler {
  domainContext: DomainContextType;
  data: any;

  constructor(domainContext: DomainContextType, data: any) {
    this.domainContext = domainContext;
    this.data = data;
  }

  abstract run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]>;
}
