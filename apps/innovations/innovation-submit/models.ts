import type { InnovationSectionCatalogueEnum, InnovationSectionStatusEnum, InnovationActionStatusEnum } from '@innovations/shared/enums';

export interface InnovationSectionModel {
  id: string | null;
  section: InnovationSectionCatalogueEnum;
  status: InnovationSectionStatusEnum;
  actionStatus: InnovationActionStatusEnum | null;
  updatedAt: Date | null;
  submittedAt: Date | null;
}