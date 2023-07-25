import type { InnovationSupportLogTypeEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  type: InnovationSupportLogTypeEnum;
  description: string;
  innovationSupportStatus?: string;
  createdBy: string;
  createdAt: Date;
  organisationUnit: null | {
    id: string;
    name: string;
    acronym: string | null;
    organisation: {
      id: string;
      name: string;
      acronym: string | null;
    };
  };
  suggestedOrganisationUnits?: {
    id: string;
    name: string;
    acronym: string | null;
    organisation: {
      id: string;
      name: string;
      acronym: string | null;
    };
  }[];
};
