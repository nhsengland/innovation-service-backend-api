import type { catalogClinicalEvidence, catalogEvidenceType } from '@innovations/shared/schemas/innovation-record/202209/catalog.types';

export type ResponseDTO = {
  evidenceType: catalogEvidenceType,
  clinicalEvidenceType?: catalogClinicalEvidence,
  description?: string,
  summary?: string,
  files?: { id: string; name: string; url: string }[];
}
