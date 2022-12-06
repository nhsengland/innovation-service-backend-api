import type { DateISOType, OrganisationType, OrganisationUnitType } from "@innovations/shared/types";

export type ResponseDTO = {
  id: string;
  type: string;
  description: string;
  innovationSupportStatus: string;
  createdBy: string;
  createdAt: DateISOType;
  organisationUnit?: {
    id: string;
    name: string;
    acronym?: string;
    organisation?: OrganisationType;
    isActive?: boolean;
    userCount?: number;
  };
  suggestedOrganisationUnits?: OrganisationUnitType[];
}
