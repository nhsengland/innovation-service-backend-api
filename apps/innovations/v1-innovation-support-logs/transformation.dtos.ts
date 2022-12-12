import type { InnovationSupportLogTypeEnum } from "@innovations/shared/enums";
import type { DateISOType } from "@innovations/shared/types";

export type ResponseDTO = {
  id: string;
  type: InnovationSupportLogTypeEnum;
  description: string;
  innovationSupportStatus: string;
  createdBy: string;
  createdAt: DateISOType;
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
}