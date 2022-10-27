import type { InnovationCategoryCatalogueEnum, InnovationStatusEnum, InnovationSupportStatusEnum } from '@innovations/shared/enums';
import type { DateISOType } from '@innovations/shared/types';

export type ResponseDTO = {

  id: string,
  name: string,
  description: null | string,
  status: InnovationStatusEnum,
  submittedAt: null | DateISOType;
  countryName: null | string;
  postCode: null | string;
  categories: InnovationCategoryCatalogueEnum[],
  otherCategoryDescription: null | string,
  owner: { id: string, name: string, isActive: boolean },
  assessment?: null | undefined | { id: string, createdAt: DateISOType, finishedAt: null | DateISOType, assignedTo: { name: string } };
  supports?: null | undefined | {
    id: string,
    status: InnovationSupportStatusEnum
  }[],
  lastEngagingSupportTransition: null | DateISOType,
}
