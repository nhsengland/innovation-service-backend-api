import type { CurrentEvidenceType } from '@innovations/shared/schemas/innovation-record';

export type ResponseDTO = Omit<CurrentEvidenceType, 'files'> & {
  files: { id: string; name: string; url: string }[];
};
