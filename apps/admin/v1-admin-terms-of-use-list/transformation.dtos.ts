import type { TermsOfUseTypeEnum } from '@admin/shared/enums';


export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    name: string;
    touType: TermsOfUseTypeEnum;
    summary: string;
    releasedAt: Date | null;
    createdAt: Date;
  }[]
}
