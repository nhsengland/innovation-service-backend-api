import type { InnovationFileOutputType } from '../_types/innovation.types';

export type ResponseDTO = {
  count: number;
  messages: {
    id: string;
    message: string;
    file?: InnovationFileOutputType;
    createdAt: Date;
    isNew: boolean;
    isEditable: boolean;
    createdBy: {
      id: string;
      name: string;
      role: string;
      isOwner?: boolean;
      organisation: { id: string; name: string; acronym: string | null } | undefined;
      organisationUnit: { id: string; name: string; acronym: string | null } | undefined;
    };
    updatedAt: Date;
  }[];
};
