import type { InnovationRelevantOrganisationsStatusEnum } from '@innovations/shared/enums';

export type ResponseDTO = {
  id: string;
  status: InnovationRelevantOrganisationsStatusEnum;
  organisation: {
    id: string;
    name: string;
    acronym: string;
    unit: { id: string; name: string; acronym: string };
  };
  recipients?: { id: string; userRoleId: string; name: string }[];
}[];
