import type { ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string,
  evidenceType: EvidenceTypeCatalogueEnum,
  clinicalEvidenceType: ClinicalEvidenceTypeCatalogueEnum,
  description: string,
  summary: string,
  files: { id: string; displayFileName: string; url: string }[];
}
