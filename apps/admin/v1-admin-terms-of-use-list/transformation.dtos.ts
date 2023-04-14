import type { TermsOfUseTypeEnum } from '@admin/shared/enums';


export type ResponseDTO = {
  count: number;
  data: {
    id: string;
    name: string;
    touType: TermsOfUseTypeEnum;
    summary: string;
    releaseAt: Date | null;
    createdAt: Date;
  }[]
}