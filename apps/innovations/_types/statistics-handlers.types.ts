import type { DomainContextType, DomainUserInfoType } from '@innovations/shared/types';
import type { InnovationStatisticsTemplateType } from '../_config/statistics.config';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';

export abstract class InnovationsStatisticsHandler {
  requestUser: DomainUserInfoType;
  domainContext: DomainContextType;
  data: any;

  constructor(requesUser: DomainUserInfoType, domainContext: DomainContextType, data: any) {
    this.requestUser = requesUser;
    this.domainContext = domainContext;
    this.data = data;
  }

  abstract run(): Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]>;
}
