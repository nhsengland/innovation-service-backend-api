import type { InnovationSupportStatusEnum, InnovationSupportSummaryTypeEnum } from '@innovations/shared/enums';

export type ResponseDTO = Record<
  keyof typeof InnovationSupportSummaryTypeEnum,
  {
    id: string;
    name: string;
    support: { id?: string; status: InnovationSupportStatusEnum; start?: Date; end?: Date; minStart?: Date };
    sameOrganisation?: boolean;
    organisation: {
      id: string;
      acronym: string;
    };
  }[]
>;
