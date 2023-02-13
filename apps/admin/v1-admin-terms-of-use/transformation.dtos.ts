import type { TermsOfUseTypeEnum } from '@admin/shared/enums';
import type { DateISOType } from '@admin/shared/types';

export type ResponseDTO = {
  id: string;
  name: string;
  touType: TermsOfUseTypeEnum;
  summary: string;
  releaseAt: DateISOType | null;
  createdAt: DateISOType;
}